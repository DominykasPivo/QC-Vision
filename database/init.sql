-- ===== QC Vision Database Initialization =====
-- PostgreSQL Schema for Quality Control Visual Testing

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ===== ENUM TYPES =====

-- Test Status
CREATE TYPE test_status AS ENUM ('open', 'in_progress', 'pending', 'finalized');

-- Product Types (examples - extend as needed)
CREATE TYPE product_type AS ENUM (
    't_shirt',
    'hoodie',
    'poster',
    'mug',
    'sticker',
    'phone_case',
    'bag',
    'other'
);

-- Test Types
CREATE TYPE test_type AS ENUM (
    'print_quality',
    'color_accuracy',
    'material_inspection',
    'packaging',
    'general'
);

-- Defect Categories
CREATE TYPE defect_category AS ENUM (
    'incorrect_colors',
    'damage',
    'print_errors',
    'embroidery_issues',
    'material_defect',
    'sizing_issue',
    'alignment_issue',
    'other'
);

-- Defect Severity
CREATE TYPE defect_severity AS ENUM ('low', 'medium', 'high', 'critical');

-- Photo Capture Method
CREATE TYPE capture_method AS ENUM ('camera', 'gallery', 'iot_device');


-- ===== TABLES =====

-- Quality Tests Table
CREATE TABLE IF NOT EXISTS tests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    external_order_id VARCHAR(100),
    product_type product_type NOT NULL DEFAULT 'other',
    test_type test_type NOT NULL DEFAULT 'general',
    status test_status NOT NULL DEFAULT 'open',
    requester VARCHAR(255),
    deadline TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE -- Soft delete
);

-- Photos Table
CREATE TABLE IF NOT EXISTS photos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    test_id UUID REFERENCES tests(id) ON DELETE SET NULL,
    filename VARCHAR(255) NOT NULL,
    original_filename VARCHAR(255),
    file_size INTEGER,
    mime_type VARCHAR(100),
    width INTEGER,
    height INTEGER,
    storage_path VARCHAR(500) NOT NULL,
    thumbnail_path VARCHAR(500),
    capture_method capture_method DEFAULT 'gallery',
    captured_at TIMESTAMP WITH TIME ZONE,
    uploaded_by VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Defects Table
CREATE TABLE IF NOT EXISTS defects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    photo_id UUID REFERENCES photos(id) ON DELETE CASCADE,
    test_id UUID REFERENCES tests(id) ON DELETE CASCADE,
    category defect_category NOT NULL,
    severity defect_severity NOT NULL DEFAULT 'medium',
    description TEXT,
    annotations JSONB, -- Stores visual annotation data (circles, areas, etc.)
    reported_by VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- AI Recognition Results Table
CREATE TABLE IF NOT EXISTS ai_recognition_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    photo_id UUID REFERENCES photos(id) ON DELETE CASCADE,
    recognized_design_id VARCHAR(255),
    confidence_score DECIMAL(5, 4), -- 0.0000 to 1.0000
    suggestions JSONB, -- Top 3-5 design suggestions with scores
    processing_time_ms INTEGER,
    model_version VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Audit Logs Table
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50) NOT NULL, -- 'test', 'photo', 'defect'
    entity_id UUID,
    user_identifier VARCHAR(255),
    ip_address INET,
    user_agent TEXT,
    old_values JSONB,
    new_values JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);


-- ===== INDEXES =====

-- Tests indexes
CREATE INDEX idx_tests_status ON tests(status);
CREATE INDEX idx_tests_product_type ON tests(product_type);
CREATE INDEX idx_tests_external_order ON tests(external_order_id);
CREATE INDEX idx_tests_created_at ON tests(created_at);
CREATE INDEX idx_tests_deadline ON tests(deadline);

-- Photos indexes
CREATE INDEX idx_photos_test_id ON photos(test_id);
CREATE INDEX idx_photos_created_at ON photos(created_at);

-- Defects indexes
CREATE INDEX idx_defects_photo_id ON defects(photo_id);
CREATE INDEX idx_defects_test_id ON defects(test_id);
CREATE INDEX idx_defects_category ON defects(category);
CREATE INDEX idx_defects_severity ON defects(severity);

-- AI Recognition indexes
CREATE INDEX idx_ai_results_photo_id ON ai_recognition_results(photo_id);
CREATE INDEX idx_ai_results_confidence ON ai_recognition_results(confidence_score);

-- Audit logs indexes
CREATE INDEX idx_audit_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_created_at ON audit_logs(created_at);
CREATE INDEX idx_audit_action ON audit_logs(action);


-- ===== TRIGGER FUNCTION FOR updated_at =====

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to tables with updated_at
CREATE TRIGGER update_tests_updated_at
    BEFORE UPDATE ON tests
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_defects_updated_at
    BEFORE UPDATE ON defects
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();


-- ===== SAMPLE DATA (Optional - for development) =====

-- Insert sample test
INSERT INTO tests (external_order_id, product_type, test_type, status, requester, notes)
VALUES 
    ('ORD-2026-001', 't_shirt', 'print_quality', 'open', 'QC Team', 'Sample test for development'),
    ('ORD-2026-002', 'hoodie', 'color_accuracy', 'in_progress', 'QC Team', 'Color verification test'),
    ('ORD-2026-003', 'poster', 'general', 'pending', 'Production Floor', 'Awaiting review');

-- Log the initialization
INSERT INTO audit_logs (action, entity_type, user_identifier)
VALUES ('database_initialized', 'system', 'docker-init');

-- Confirm initialization
SELECT 'QC Vision database initialized successfully!' AS status;
