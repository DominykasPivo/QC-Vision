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

DO $$ BEGIN
  CREATE TYPE photo_verification_status AS ENUM ('pending','approved','rejected');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;


CREATE TABLE IF NOT EXISTS colors (
  id        SERIAL PRIMARY KEY,
  name      TEXT NOT NULL UNIQUE,
  hex_value VARCHAR(7) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE
);

INSERT INTO colors (name, hex_value) VALUES
  ('White', '#FFFFFF'),
  ('Black', '#000000'),
  ('Red', '#EF4444'),
  ('Navy Blue', '#1E3A5F'),
  ('Royal Blue', '#2563EB'),
  ('Sky Blue', '#38BDF8'),
  ('Forest Green', '#166534'),
  ('Lime Green', '#84CC16'),
  ('Mint', '#6EE7B7'),
  ('Yellow', '#EAB308'),
  ('Gold', '#F59E0B'),
  ('Orange', '#F97316'),
  ('Pink', '#F472B6'),
  ('Hot Pink', '#EC4899'),
  ('Magenta', '#D946EF'),
  ('Purple', '#9333EA'),
  ('Lavender', '#A78BFA'),
  ('Maroon', '#7F1D1D'),
  ('Burgundy', '#881337'),
  ('Coral', '#FB7185'),
  ('Salmon', '#FCA5A5'),
  ('Peach', '#FDBA74'),
  ('Brown', '#92400E'),
  ('Tan', '#D97706'),
  ('Beige', '#F5F5DC'),
  ('Cream', '#FFFDD0'),
  ('Ivory', '#FFFFF0'),
  ('Grey', '#6B7280'),
  ('Light Grey', '#D1D5DB'),
  ('Dark Grey', '#374151'),
  ('Charcoal', '#1F2937'),
  ('Silver', '#C0C0C0'),
  ('Khaki', '#C3B091'),
  ('Olive', '#708238'),
  ('Teal', '#0D9488'),
  ('Turquoise', '#06B6D4'),
  ('Indigo', '#4338CA'),
  ('Rust', '#B45309'),
  ('Camel', '#C19A6B'),
  ('Off-White', '#FAF9F6')
ON CONFLICT (name) DO NOTHING;


CREATE TABLE IF NOT EXISTS quality_tests (
  id            SERIAL PRIMARY KEY,
  jira_id       VARCHAR(100) NOT NULL,
  product_name  VARCHAR(255) NOT NULL,

  test_type     test_type NOT NULL,
  requester     TEXT,
  assigned_to   TEXT,
  description   TEXT,

  status        test_status NOT NULL DEFAULT 'open',
  deadline_at   TIMESTAMPTZ,

  -- review fields
  review_status  TEXT NOT NULL DEFAULT 'pending',
  reviewed_by    TEXT,
  reviewed_at    TIMESTAMPTZ,
  review_comment TEXT,

  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS test_colors (
  test_id   INT NOT NULL REFERENCES quality_tests(id) ON DELETE CASCADE,
  color_id  INT NOT NULL REFERENCES colors(id) ON DELETE CASCADE,
  PRIMARY KEY (test_id, color_id)
);
CREATE INDEX IF NOT EXISTS idx_test_colors_test_id  ON test_colors(test_id);
CREATE INDEX IF NOT EXISTS idx_test_colors_color_id ON test_colors(color_id);


--allows tests to be searched by status, deadline, creation date, jira_id
CREATE INDEX IF NOT EXISTS idx_quality_tests_status    ON quality_tests(status);
CREATE INDEX IF NOT EXISTS idx_quality_tests_deadline  ON quality_tests(deadline_at);
CREATE INDEX IF NOT EXISTS idx_quality_tests_created   ON quality_tests(created_at);
CREATE INDEX IF NOT EXISTS idx_quality_tests_jira_id   ON quality_tests(jira_id);


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
  analysis_results TEXT,
  description     TEXT,
  verification_status photo_verification_status NOT NULL DEFAULT 'pending'
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

  photo_id    INT NOT NULL REFERENCES photos(id) ON DELETE CASCADE,

  description TEXT,
  severity    defect_severity NOT NULL DEFAULT 'low',

  -- review fields
  review_status  TEXT NOT NULL DEFAULT 'pending',
  reviewed_by    TEXT,
  reviewed_at    TIMESTAMPTZ,
  review_comment TEXT,

  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);


CREATE INDEX IF NOT EXISTS idx_defects_photo_id   ON defects(photo_id);
CREATE INDEX IF NOT EXISTS idx_defects_severity   ON defects(severity);
CREATE INDEX IF NOT EXISTS idx_defects_review_status ON defects(review_status);
CREATE INDEX IF NOT EXISTS idx_defects_reviewed_by ON defects(reviewed_by);


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

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL DEFAULT 'user'  -- user|reviewer|admin
);
