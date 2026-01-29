-- Glyph Data Annotation Platform
-- Migration 0011: Create project_types tables

-- =============================================================================
-- Project Types Table
-- =============================================================================

CREATE TABLE project_types (
    project_type_id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name                    VARCHAR(255) NOT NULL UNIQUE,
    description             TEXT,
    input_schema            JSONB NOT NULL DEFAULT '{}',
    output_schema           JSONB NOT NULL DEFAULT '{}',
    estimated_duration_seconds INTEGER,
    difficulty_level        VARCHAR(50),
    is_system               BOOLEAN NOT NULL DEFAULT false,
    created_by              UUID REFERENCES users(user_id),
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_project_types_name ON project_types (name);
CREATE INDEX idx_project_types_system ON project_types (is_system);
CREATE INDEX idx_project_types_created_by ON project_types (created_by);

CREATE TRIGGER update_project_types_updated_at
    BEFORE UPDATE ON project_types
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- Project Type Skill Requirements Junction Table
-- =============================================================================

CREATE TABLE project_type_skill_requirements (
    project_type_id     UUID NOT NULL REFERENCES project_types(project_type_id) ON DELETE CASCADE,
    skill_id            VARCHAR(100) NOT NULL,
    min_proficiency     VARCHAR(50) NOT NULL DEFAULT 'intermediate',
    is_required         BOOLEAN NOT NULL DEFAULT true,
    weight              REAL DEFAULT 1.0,
    PRIMARY KEY (project_type_id, skill_id)
);

CREATE INDEX idx_project_type_skills_type ON project_type_skill_requirements (project_type_id);
CREATE INDEX idx_project_type_skills_skill ON project_type_skill_requirements (skill_id);

-- =============================================================================
-- Add project_type_id to projects table
-- =============================================================================

ALTER TABLE projects
ADD COLUMN project_type_id UUID REFERENCES project_types(project_type_id);

CREATE INDEX idx_projects_type ON projects (project_type_id);

-- =============================================================================
-- Comments
-- =============================================================================

COMMENT ON TABLE project_types IS 'Reusable project templates with JSON schemas and skill requirements';
COMMENT ON TABLE project_type_skill_requirements IS 'Skill requirements for each project type';
COMMENT ON COLUMN projects.project_type_id IS 'Optional project type for schema validation and skill matching';
