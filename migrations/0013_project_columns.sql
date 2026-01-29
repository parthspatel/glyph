-- Glyph Data Annotation Platform
-- Migration 0013: Make workflow_id and layout_id optional, add missing project columns
-- Purpose: Align database schema with domain model for project creation without workflow

-- Make workflow_id and layout_id nullable (projects can be created without these)
ALTER TABLE projects
ALTER COLUMN workflow_id DROP NOT NULL;

ALTER TABLE projects
ALTER COLUMN layout_id DROP NOT NULL;

-- Add missing columns from domain model
ALTER TABLE projects
ADD COLUMN IF NOT EXISTS project_type_id UUID REFERENCES project_types(project_type_id);

ALTER TABLE projects
ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES teams(team_id);

ALTER TABLE projects
ADD COLUMN IF NOT EXISTS tags JSONB NOT NULL DEFAULT '[]';

ALTER TABLE projects
ADD COLUMN IF NOT EXISTS documentation TEXT;

ALTER TABLE projects
ADD COLUMN IF NOT EXISTS deadline TIMESTAMPTZ;

ALTER TABLE projects
ADD COLUMN IF NOT EXISTS deadline_action VARCHAR(50);

-- Add indexes for new columns
CREATE INDEX IF NOT EXISTS idx_projects_project_type ON projects (project_type_id);
CREATE INDEX IF NOT EXISTS idx_projects_team ON projects (team_id);
CREATE INDEX IF NOT EXISTS idx_projects_deadline ON projects (deadline) WHERE deadline IS NOT NULL;

-- Comments
COMMENT ON COLUMN projects.project_type_id IS 'Project type defining schemas and skill requirements';
COMMENT ON COLUMN projects.team_id IS 'Team assigned to this project';
COMMENT ON COLUMN projects.tags IS 'Project tags for categorization and search';
COMMENT ON COLUMN projects.documentation IS 'Project documentation and notes';
COMMENT ON COLUMN projects.deadline IS 'Project deadline';
COMMENT ON COLUMN projects.deadline_action IS 'Action to take when deadline is reached: notify, pause, escalate';
