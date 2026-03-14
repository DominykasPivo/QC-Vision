ALTER TABLE audit_logs
ADD COLUMN IF NOT EXISTS test_id INT,
ADD COLUMN IF NOT EXISTS attribute TEXT,
ADD COLUMN IF NOT EXISTS old_value JSONB,
ADD COLUMN IF NOT EXISTS new_value JSONB,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

UPDATE audit_logs
SET test_id = entity_id
WHERE test_id IS NULL
  AND entity_type = 'Test';

UPDATE audit_logs
SET test_id = NULLIF(meta->>'test_id', '')::INT
WHERE test_id IS NULL
  AND meta ? 'test_id';

UPDATE audit_logs
SET new_value = meta
WHERE new_value IS NULL
  AND action = 'CREATE';

UPDATE audit_logs
SET old_value = meta
WHERE old_value IS NULL
  AND action IN ('DELETE', 'REMOVE_DEFECT');

UPDATE audit_logs
SET action = 'CREATE'
WHERE action = 'ADD_DEFECT'
  AND entity_type = 'Defect';

UPDATE audit_logs
SET action = 'DELETE'
WHERE action = 'REMOVE_DEFECT'
  AND entity_type = 'Defect';

UPDATE audit_logs
SET updated_at = created_at
WHERE updated_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_audit_logs_test_id ON audit_logs(test_id);
