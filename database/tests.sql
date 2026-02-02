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
  -- 5) Check FK RESTRICT behavior: cannot delete quality_test with photos
  ---------------------------------------------------------------------------
  BEGIN
    DELETE FROM quality_tests WHERE id = 1;
    RAISE EXCEPTION 'FK RESTRICT failed: was able to delete quality_tests.id=1 even though photos exist';
  EXCEPTION
    WHEN foreign_key_violation THEN
      RAISE NOTICE 'OK: FK restrict prevents deleting test with photos';
  END;

  ---------------------------------------------------------------------------
  -- 6) Check FK RESTRICT behavior: cannot delete photo with defects
  ---------------------------------------------------------------------------
  BEGIN
    DELETE FROM photos WHERE id = 1;
    RAISE EXCEPTION 'FK RESTRICT failed: was able to delete photos.id=1 even though defects exist';
  EXCEPTION
    WHEN foreign_key_violation THEN
      RAISE NOTICE 'OK: FK restrict prevents deleting photo with defects';
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
