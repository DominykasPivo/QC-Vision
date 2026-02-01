-- demo.sql
-- Purpose: Reset demo tables and insert realistic sample data for QC-Vision.
-- Safe to re-run: it truncates data and restarts identities.

BEGIN;

-- Clean main data tables (keep defect_category as a lookup table)
TRUNCATE TABLE
  defect_annotations,
  defects,
  photos,
  audit_logs,
  quality_tests
RESTART IDENTITY;

-- Ensure defect categories exist (in case init.sql wasn't run or was modified)
INSERT INTO defect_category (name)
VALUES
  ('Incorrect Colors'),
  ('Damage'),
  ('Print Errors'),
  ('Embroidery Issues'),
  ('Other')
ON CONFLICT (name) DO NOTHING;

-- Insert quality tests (IDs will start at 1 because of RESTART IDENTITY)
INSERT INTO quality_tests (product_id, test_type, requester, assigned_to, status, deadline_at)
VALUES
  (101, 'incoming',    'Alice', 'Bob',   'open',        now() + interval '3 days'),
  (102, 'in_process',  'Carol', NULL,    'in_progress', now() + interval '1 day'),
  (103, 'final',       'Dave',  'Eve',   'finalized',   now() - interval '2 days'),
  (104, 'other',       'Mona',  'Omar',  'pending',     now() + interval '5 days');

-- Insert photos linked to tests
INSERT INTO photos (test_id, file_path, analysis_results)
VALUES
  (1, '/uploads/test1/photo1.jpg', '{"ai":"none","note":"front view"}'),
  (1, '/uploads/test1/photo2.jpg', '{"ai":"none","note":"back view"}'),
  (2, '/uploads/test2/photo1.jpg', '{"ai":"none","note":"side view"}'),
  (4, '/uploads/test4/photo1.jpg', '{"ai":"none","note":"close-up"}');

-- Insert defects (photo_id references photos)
INSERT INTO defects (photo_id, description, severity)
VALUES
  (1, 'Ink smear on logo print', 'high'),
  (1, 'Wrong shade of red vs sample', 'medium'),
  (2, 'Loose embroidery thread', 'low'),
  (3, 'Small tear near seam', 'critical');

-- Insert annotations (geometry JSONB) linking to defect + category
-- We'll resolve category_id by name
INSERT INTO defect_annotations (defect_id, category_id, geometry)
VALUES
  (
    1,
    (SELECT id FROM defect_category WHERE name = 'Print Errors'),
    jsonb_build_object(
      'type','circle',
      'center', jsonb_build_object('x', 0.42, 'y', 0.55),
      'radius', 0.08
    )
  ),
  (
    2,
    (SELECT id FROM defect_category WHERE name = 'Incorrect Colors'),
    jsonb_build_object(
      'type','polygon',
      'points', jsonb_build_array(
        jsonb_build_object('x',0.10,'y',0.20),
        jsonb_build_object('x',0.30,'y',0.25),
        jsonb_build_object('x',0.25,'y',0.45)
      )
    )
  ),
  (
    3,
    (SELECT id FROM defect_category WHERE name = 'Embroidery Issues'),
    jsonb_build_object(
      'type','rectangle',
      'topLeft', jsonb_build_object('x', 0.60, 'y', 0.20),
      'bottomRight', jsonb_build_object('x', 0.78, 'y', 0.35)
    )
  ),
  (
    4,
    (SELECT id FROM defect_category WHERE name = 'Damage'),
    jsonb_build_object(
      'type','circle',
      'center', jsonb_build_object('x', 0.52, 'y', 0.72),
      'radius', 0.05
    )
  );

-- Insert audit logs (simple realistic events)
INSERT INTO audit_logs (action, entity_type, entity_id, meta, username)
VALUES
  ('create_test', 'quality_tests', 1, jsonb_build_object('product_id',101,'test_type','incoming'), 'Alice'),
  ('upload_photo', 'photos', 1, jsonb_build_object('file_path','/uploads/test1/photo1.jpg'), 'Bob'),
  ('upload_photo', 'photos', 2, jsonb_build_object('file_path','/uploads/test1/photo2.jpg'), 'Bob'),
  ('add_defect', 'defects', 1, jsonb_build_object('severity','high'), 'Bob'),
  ('add_defect', 'defects', 4, jsonb_build_object('severity','critical'), 'Carol'),
  ('finalize_test', 'quality_tests', 3, jsonb_build_object('status','finalized'), 'Eve');

COMMIT;

-- Quick sanity outputs
SELECT 'Demo loaded: quality_tests' AS msg, count(*) AS rows FROM quality_tests;
SELECT 'Demo loaded: photos' AS msg, count(*) AS rows FROM photos;
SELECT 'Demo loaded: defects' AS msg, count(*) AS rows FROM defects;
SELECT 'Demo loaded: defect_annotations' AS msg, count(*) AS rows FROM defect_annotations;
SELECT 'Demo loaded: audit_logs' AS msg, count(*) AS rows FROM audit_logs;
