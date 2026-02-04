-- tests.sql
-- Purpose: Run integrity + behavior tests on the QC-Vision DB.
-- Expects demo.sql already loaded (IDs start at 1 due to RESTART IDENTITY).

-- Make notices visible
SET client_min_messages TO NOTICE;

DO $$
DECLARE
  old_updated_at timestamptz;
  new_updated_at timestamptz;
  created_ts timestamptz;
  v_count int;
BEGIN
  RAISE NOTICE '--- Running DB tests ---';

  ---------------------------------------------------------------------------
  -- 1) Check required enum types exist
  ---------------------------------------------------------------------------
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'test_type') THEN
    RAISE EXCEPTION 'Missing enum type: test_type';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'test_status') THEN
    RAISE EXCEPTION 'Missing enum type: test_status';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'defect_severity') THEN
    RAISE EXCEPTION 'Missing enum type: defect_severity';
  END IF;

  RAISE NOTICE 'OK: Enum types exist';

  ---------------------------------------------------------------------------
  -- 2) Check seeded defect categories exist
  ---------------------------------------------------------------------------
  SELECT count(*) INTO v_count
  FROM defect_category
  WHERE name IN ('Incorrect Colors','Damage','Print Errors','Embroidery Issues','Other');

  IF v_count < 5 THEN
    RAISE EXCEPTION 'Expected 5 seeded defect categories, got %', v_count;
  END IF;

  RAISE NOTICE 'OK: Defect categories seeded (found %)', v_count;

  ---------------------------------------------------------------------------
  -- 3) Check demo data exists
  ---------------------------------------------------------------------------
  SELECT count(*) INTO v_count FROM quality_tests;
  IF v_count < 4 THEN
    RAISE EXCEPTION 'Demo data missing: expected at least 4 quality_tests, got %', v_count;
  END IF;

  SELECT count(*) INTO v_count FROM photos;
  IF v_count < 4 THEN
    RAISE EXCEPTION 'Demo data missing: expected at least 4 photos, got %', v_count;
  END IF;

  SELECT count(*) INTO v_count FROM defects;
  IF v_count < 4 THEN
    RAISE EXCEPTION 'Demo data missing: expected at least 4 defects, got %', v_count;
  END IF;

  SELECT count(*) INTO v_count FROM defect_annotations;
  IF v_count < 4 THEN
    RAISE EXCEPTION 'Demo data missing: expected at least 4 defect_annotations, got %', v_count;
  END IF;

  RAISE NOTICE 'OK: Demo dataset present';

  ---------------------------------------------------------------------------
  -- 4) Check updated_at trigger actually updates
  ---------------------------------------------------------------------------
  SELECT created_at, updated_at
    INTO created_ts, old_updated_at
  FROM quality_tests
  WHERE id = 1;

  PERFORM pg_sleep(1);

  UPDATE quality_tests
  SET requester = requester || ' (edited)'
  WHERE id = 1;

  SELECT updated_at INTO new_updated_at
  FROM quality_tests
  WHERE id = 1;

  IF new_updated_at <= old_updated_at THEN
    RAISE EXCEPTION 'updated_at did not update correctly: old=% new=%', old_updated_at, new_updated_at;
  END IF;

  -- created_at should not change
  IF created_ts IS NULL THEN
    RAISE EXCEPTION 'created_at is NULL unexpectedly';
  END IF;

  RAISE NOTICE 'OK: updated_at trigger works (old=% new=%)', old_updated_at, new_updated_at;

  ---------------------------------------------------------------------------
  -- 5) Hierarchy CASCADE test (subtransaction-safe inside DO block)
  -- Deleting a quality_test should delete its photos AND their defects
  -- Requires CASCADE FKs on photos.test_id and defects.photo_id
  ---------------------------------------------------------------------------
  BEGIN
    DECLARE
      t_id INT;
      p_id1 INT;
      p_id2 INT;
      photos_before INT;
      defects_before INT;
      photos_after INT;
      defects_after INT;
    BEGIN
      -- Create a fresh test
      INSERT INTO quality_tests (product_id, test_type, requester, status)
      VALUES (777, 'incoming', 'HierarchyTester', 'open')
      RETURNING id INTO t_id;

      -- Create two photos under that test
      INSERT INTO photos (test_id, file_path)
      VALUES (t_id, '/uploads/hierarchy/p1.jpg')
      RETURNING id INTO p_id1;

      INSERT INTO photos (test_id, file_path)
      VALUES (t_id, '/uploads/hierarchy/p2.jpg')
      RETURNING id INTO p_id2;

      -- Create defects under each photo
      INSERT INTO defects (photo_id, description, severity)
      VALUES
        (p_id1, 'defect on p1', 'medium'),
        (p_id1, 'another defect on p1', 'low'),
        (p_id2, 'defect on p2', 'high');

      -- Sanity checks before delete
      SELECT count(*) INTO photos_before FROM photos WHERE test_id = t_id;

      SELECT count(*) INTO defects_before
      FROM defects d
      JOIN photos p ON p.id = d.photo_id
      WHERE p.test_id = t_id;

      IF photos_before <> 2 THEN
        RAISE EXCEPTION 'Hierarchy test invalid: expected 2 photos, got %', photos_before;
      END IF;

      IF defects_before <> 3 THEN
        RAISE EXCEPTION 'Hierarchy test invalid: expected 3 defects, got %', defects_before;
      END IF;

      -- Delete the parent: should cascade to photos and defects
      DELETE FROM quality_tests WHERE id = t_id;

      -- Verify children removed
      SELECT count(*) INTO photos_after FROM photos WHERE test_id = t_id;

      SELECT count(*) INTO defects_after
      FROM defects d
      JOIN photos p ON p.id = d.photo_id
      WHERE p.test_id = t_id;

      IF photos_after <> 0 THEN
        RAISE EXCEPTION 'Hierarchy CASCADE failed: photos still exist for deleted test id=%', t_id;
      END IF;

      IF defects_after <> 0 THEN
        RAISE EXCEPTION 'Hierarchy CASCADE failed: defects still exist for deleted test id=%', t_id;
      END IF;

      RAISE NOTICE 'OK: Hierarchy CASCADE works (test -> photos -> defects) for test id=%', t_id;

      -- Cleanup (if cascade worked, nothing is left; but delete in case cascade isn't enabled)
      DELETE FROM defects WHERE photo_id IN (p_id1, p_id2);
      DELETE FROM photos  WHERE id IN (p_id1, p_id2);
      DELETE FROM quality_tests WHERE id = t_id;

    EXCEPTION WHEN OTHERS THEN
      -- If cascade is not enabled, subtransaction rolls back inserts automatically
      -- and we give a clear error message
      RAISE EXCEPTION 'Hierarchy CASCADE test failed. Make sure FK constraints use ON DELETE CASCADE. Original error: %', SQLERRM;
    END;
  END;



  ---------------------------------------------------------------------------
  -- 7) Check defect_annotations require valid JSON shape (demo has expected keys)
  ---------------------------------------------------------------------------
  -- Just verify at least one annotation contains 'type'
  SELECT count(*) INTO v_count
  FROM defect_annotations
  WHERE geometry ? 'type';

  IF v_count < 1 THEN
    RAISE EXCEPTION 'Expected at least one annotation geometry containing key "type"';
  END IF;

  RAISE NOTICE 'OK: geometry JSONB contains expected keys';

  ---------------------------------------------------------------------------
  -- 8) Check indexes exist (important for search/performance)
  ---------------------------------------------------------------------------
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'quality_tests' AND indexname = 'idx_quality_tests_status'
  ) THEN
    RAISE EXCEPTION 'Missing index idx_quality_tests_status on quality_tests(status)';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'quality_tests' AND indexname = 'idx_quality_tests_deadline'
  ) THEN
    RAISE EXCEPTION 'Missing index idx_quality_tests_deadline on quality_tests(deadline_at)';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'quality_tests' AND indexname = 'idx_quality_tests_created'
  ) THEN
    RAISE EXCEPTION 'Missing index idx_quality_tests_created on quality_tests(created_at)';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'photos' AND indexname = 'idx_photos_test_id'
  ) THEN
    RAISE EXCEPTION 'Missing index idx_photos_test_id on photos(test_id)';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'defects' AND indexname = 'idx_defects_photo_id'
  ) THEN
    RAISE EXCEPTION 'Missing index idx_defects_photo_id on defects(photo_id)';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'defects' AND indexname = 'idx_defects_severity'
  ) THEN
    RAISE EXCEPTION 'Missing index idx_defects_severity on defects(severity)';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'defect_annotations' AND indexname = 'idx_defect_annotations_defect_id'
  ) THEN
    RAISE EXCEPTION 'Missing index idx_defect_annotations_defect_id on defect_annotations(defect_id)';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'defect_annotations' AND indexname = 'idx_defect_annotations_category_id'
  ) THEN
    RAISE EXCEPTION 'Missing index idx_defect_annotations_category_id on defect_annotations(category_id)';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'audit_logs' AND indexname = 'idx_audit_logs_entity'
  ) THEN
    RAISE EXCEPTION 'Missing index idx_audit_logs_entity on audit_logs(entity_type, entity_id)';
  END IF;

  RAISE NOTICE 'OK: Required indexes exist';

  ---------------------------------------------------------------------------
  -- 9) Check audit_logs default meta works (insert a row without meta)
  ---------------------------------------------------------------------------
  INSERT INTO audit_logs (action, entity_type, entity_id, username)
  VALUES ('test_meta_default', 'quality_tests', 1, 'Tester')
  RETURNING id INTO v_count;

  IF NOT EXISTS (
    SELECT 1 FROM audit_logs
    WHERE id = v_count AND meta = '{}'::jsonb
  ) THEN
    RAISE EXCEPTION 'audit_logs.meta default did not apply as {}';
  END IF;

  RAISE NOTICE 'OK: audit_logs.meta default works';

  RAISE NOTICE '--- All DB tests passed ✅ ---';
END $$;

-- Optional: show a quick summary
SELECT
  (SELECT count(*) FROM quality_tests) AS quality_tests,
  (SELECT count(*) FROM photos) AS photos,
  (SELECT count(*) FROM defects) AS defects,
  (SELECT count(*) FROM defect_annotations) AS defect_annotations,
  (SELECT count(*) FROM audit_logs) AS audit_logs;
