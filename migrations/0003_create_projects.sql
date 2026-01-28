-- Glyph Data Annotation Platform
-- Migration 0003: Create projects and workflows tables

-- =============================================================================
-- Workflows Table
-- =============================================================================

CREATE TABLE workflows (
    workflow_id     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(255) NOT NULL,
    workflow_type   workflow_type NOT NULL DEFAULT 'single',
    entry_step_id   VARCHAR(100) NOT NULL,
    exit_step_ids   JSONB NOT NULL DEFAULT '[]',
    steps           JSONB NOT NULL DEFAULT '[]',
    transitions     JSONB NOT NULL DEFAULT '[]',
    settings        JSONB NOT NULL DEFAULT '{}',
    hooks           JSONB NOT NULL DEFAULT '{}',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_workflows_type ON workflows (workflow_type);

CREATE TRIGGER update_workflows_updated_at
    BEFORE UPDATE ON workflows
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- Projects Table
-- =============================================================================

CREATE TABLE projects (
    project_id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(255) NOT NULL,
    description     TEXT,
    status          project_status NOT NULL DEFAULT 'draft',
    workflow_id     UUID NOT NULL REFERENCES workflows(workflow_id),
    layout_id       VARCHAR(255) NOT NULL,
    settings        JSONB NOT NULL DEFAULT '{}',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by      UUID NOT NULL REFERENCES users(user_id)
);

CREATE INDEX idx_projects_status ON projects (status);
CREATE INDEX idx_projects_workflow ON projects (workflow_id);
CREATE INDEX idx_projects_created_by ON projects (created_by);

CREATE TRIGGER update_projects_updated_at
    BEFORE UPDATE ON projects
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- Goals Table
-- =============================================================================

CREATE TABLE goals (
    goal_id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id      UUID NOT NULL REFERENCES projects(project_id) ON DELETE CASCADE,
    name            VARCHAR(255) NOT NULL,
    goal_type       goal_type NOT NULL,
    target_value    DOUBLE PRECISION NOT NULL,
    current_value   DOUBLE PRECISION NOT NULL DEFAULT 0,
    deadline        TIMESTAMPTZ,
    contributions   JSONB NOT NULL DEFAULT '[]',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_goals_project ON goals (project_id);
CREATE INDEX idx_goals_type ON goals (goal_type);
CREATE INDEX idx_goals_deadline ON goals (deadline) WHERE deadline IS NOT NULL;

CREATE TRIGGER update_goals_updated_at
    BEFORE UPDATE ON goals
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- Comments
-- =============================================================================

COMMENT ON TABLE workflows IS 'Workflow definitions with steps and transitions';
COMMENT ON TABLE projects IS 'Annotation projects containing tasks';
COMMENT ON TABLE goals IS 'Project goals for tracking progress';
