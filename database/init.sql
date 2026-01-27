CREATE TABLE reviewers (
  reviewer_id SERIAL PRIMARY KEY,

  first_name  TEXT NOT NULL,
  last_name   TEXT NOT NULL,

  username    TEXT GENERATED ALWAYS AS
              (lower(left(first_name, 2) || left(last_name, 3))) STORED,

  email       TEXT UNIQUE NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (username)
);



CREATE TABLE quality_tests (
  id SERIAL PRIMARY KEY,
  porductID   INT NOT NULL UNIQUE

  test_type   ENUM,
  requester   TEXT,
  status      ENUM('open','in_progress','pending','finalized') NOT NULL DEFAULT 'open',
  deadline_at TIMESTAMPTZ,

  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_quality_tests_status   ON quality_tests(status);
CREATE INDEX idx_quality_tests_deadline ON quality_tests(deadline_at);
CREATE INDEX idx_quality_tests_created  ON quality_tests(created_at);


CREATE TABLE photos (
  id SERIAL PRIMARY KEY,
  quality_test_id INT NOT NULL REFERENCES quality_tests(id) ON DELETE RESTRICT,

  object_key TEXT NOT NULL,        
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_photos_quality_test_id ON photos(quality_test_id);


CREATE OR REPLACE FUNCTION prevent_photo_relinkage()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.quality_test_id <> OLD.quality_test_id THEN
    RAISE EXCEPTION 'Relinking photos to a different quality test is not allowed.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_photo_relinkage ON photos;

CREATE TRIGGER trg_prevent_photo_relinkage
BEFORE UPDATE OF quality_test_id ON photos
FOR EACH ROW
EXECUTE FUNCTION prevent_photo_relinkage();


CREATE TABLE defect_categories (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE
);

INSERT INTO defect_categories (name)
('Incorrect Colors'),
('Damage'),
('Print Errors'),
('Embroidery Issues'),
('Other')
ON CONFLICT (name) DO NOTHING;



CREATE TABLE defects (
  id SERIAL PRIMARY KEY,
  photo_id INT NOT NULL REFERENCES photos(id) ON DELETE RESTRICT,

  category_id INT NOT NULL REFERENCES defect_categories(id) ON DELETE RESTRICT,

  description TEXT,
  severity ENUM('low','medium','high','critical') NOT NULL DEFAULT 'low',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_defects_photo_id    ON defects(photo_id);
CREATE INDEX idx_defects_category_id ON defects(category_id);
CREATE INDEX idx_defects_severity    ON defects(severity);

CREATE TABLE defect_annotations (
  id SERIAL PRIMARY KEY,
  defect_id INT NOT NULL REFERENCES defects(id) ON DELETE RESTRICT,

  geometry JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_defect_annotations_defect_id ON defect_annotations(defect_id);



CREATE TABLE audit_logs (
  id SERIAL PRIMARY KEY,

  action      TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id   INT NOT NULL,

  meta        JSONB NOT NULL DEFAULT '{}'::jsonb,

  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),

  username    TEXT NOT NULL,
);

CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX idx_audit_logs_action     ON audit_logs(action);
CREATE INDEX idx_audit_logs_entity     ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_username   ON audit_logs(username);
