DO $$ BEGIN
  CREATE TYPE test_type AS ENUM ('incoming','in_process','final','other');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE test_status AS ENUM ('open','in_progress','pending','finalized');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE defect_severity AS ENUM ('low','medium','high','critical');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;


CREATE TABLE IF NOT EXISTS quality_tests (
  id            SERIAL PRIMARY KEY,
  product_id    INT NOT NULL,

  test_type     test_type NOT NULL,
  requester     TEXT,
  assigned_to  TEXT,
  description  TEXT,

  status        test_status NOT NULL DEFAULT 'open',
  deadline_at TIMESTAMPTZ,

  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

--allows tests to be searched by status, deadline, creation date
CREATE INDEX IF NOT EXISTS idx_quality_tests_status    ON quality_tests(status);
CREATE INDEX IF NOT EXISTS idx_quality_tests_deadline  ON quality_tests(deadline_at);
CREATE INDEX IF NOT EXISTS idx_quality_tests_created   ON quality_tests(created_at);


--updates the updated_at field automatically 
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_quality_tests_updated_at ON quality_tests;
CREATE TRIGGER trg_quality_tests_updated_at
BEFORE UPDATE ON quality_tests
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();



CREATE TABLE IF NOT EXISTS photos (
  id              SERIAL PRIMARY KEY,

  test_id INT NOT NULL REFERENCES quality_tests(id) ON DELETE CASCADE,

  file_path       TEXT NOT NULL,
  time_stamp      TIMESTAMPTZ NOT NULL DEFAULT now(),
  analysis_results TEXT
);

CREATE INDEX IF NOT EXISTS idx_photos_test_id ON photos(test_id);



CREATE TABLE IF NOT EXISTS defect_category (
  id        SERIAL PRIMARY KEY,
  name      TEXT NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE
);

INSERT INTO defect_category (name)
VALUES
  ('Incorrect Colors'),
  ('Damage'),
  ('Print Errors'),
  ('Embroidery Issues'),
  ('Other')
ON CONFLICT (name) DO NOTHING;



CREATE TABLE IF NOT EXISTS defects (
  id          SERIAL PRIMARY KEY,

  -- one photo can have multiple defects
  photo_id    INT NOT NULL REFERENCES photos(id) ON DELETE CASCADE,

  description TEXT,
  severity    defect_severity NOT NULL DEFAULT 'low',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_defects_photo_id   ON defects(photo_id);
CREATE INDEX IF NOT EXISTS idx_defects_severity   ON defects(severity);


CREATE TABLE IF NOT EXISTS defect_annotations (
  id          SERIAL PRIMARY KEY,

  -- one defect can have multiple annotations (e.g., multiple areas marked)
  defect_id   INT NOT NULL REFERENCES defects(id) ON DELETE CASCADE,

  -- multiple annotations can belong to the same category
  category_id INT NOT NULL REFERENCES defect_category(id) ON DELETE RESTRICT,

  geometry    JSONB NOT NULL,
  color       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_defect_annotations_defect_id   ON defect_annotations(defect_id);
CREATE INDEX IF NOT EXISTS idx_defect_annotations_category_id ON defect_annotations(category_id);



CREATE TABLE IF NOT EXISTS audit_logs (
  id          SERIAL PRIMARY KEY,

  action      TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id   INT  NOT NULL,

  meta        JSONB NOT NULL DEFAULT '{}'::jsonb,

  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  username    TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action     ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity     ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_username   ON audit_logs(username);
