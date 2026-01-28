-- Glyph Data Annotation Platform
-- Migration 0004: Create tasks and assignments tables (partitioned)

-- =============================================================================
-- Tasks Table (Hash Partitioned by project_id)
-- =============================================================================

CREATE TABLE tasks (
    task_id         UUID NOT NULL DEFAULT gen_random_uuid(),
    project_id      UUID NOT NULL,
    status          task_status NOT NULL DEFAULT 'pending',
    priority        INT NOT NULL DEFAULT 0,
    input_data      JSONB NOT NULL,
    workflow_state  JSONB NOT NULL DEFAULT '{}',
    metadata        JSONB NOT NULL DEFAULT '{}',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at    TIMESTAMPTZ,

    PRIMARY KEY (project_id, task_id),
    CONSTRAINT valid_priority CHECK (priority >= -100 AND priority <= 100)
) PARTITION BY HASH (project_id);

-- Create 16 partitions for task distribution
CREATE TABLE tasks_p0 PARTITION OF tasks FOR VALUES WITH (MODULUS 16, REMAINDER 0);
CREATE TABLE tasks_p1 PARTITION OF tasks FOR VALUES WITH (MODULUS 16, REMAINDER 1);
CREATE TABLE tasks_p2 PARTITION OF tasks FOR VALUES WITH (MODULUS 16, REMAINDER 2);
CREATE TABLE tasks_p3 PARTITION OF tasks FOR VALUES WITH (MODULUS 16, REMAINDER 3);
CREATE TABLE tasks_p4 PARTITION OF tasks FOR VALUES WITH (MODULUS 16, REMAINDER 4);
CREATE TABLE tasks_p5 PARTITION OF tasks FOR VALUES WITH (MODULUS 16, REMAINDER 5);
CREATE TABLE tasks_p6 PARTITION OF tasks FOR VALUES WITH (MODULUS 16, REMAINDER 6);
CREATE TABLE tasks_p7 PARTITION OF tasks FOR VALUES WITH (MODULUS 16, REMAINDER 7);
CREATE TABLE tasks_p8 PARTITION OF tasks FOR VALUES WITH (MODULUS 16, REMAINDER 8);
CREATE TABLE tasks_p9 PARTITION OF tasks FOR VALUES WITH (MODULUS 16, REMAINDER 9);
CREATE TABLE tasks_p10 PARTITION OF tasks FOR VALUES WITH (MODULUS 16, REMAINDER 10);
CREATE TABLE tasks_p11 PARTITION OF tasks FOR VALUES WITH (MODULUS 16, REMAINDER 11);
CREATE TABLE tasks_p12 PARTITION OF tasks FOR VALUES WITH (MODULUS 16, REMAINDER 12);
CREATE TABLE tasks_p13 PARTITION OF tasks FOR VALUES WITH (MODULUS 16, REMAINDER 13);
CREATE TABLE tasks_p14 PARTITION OF tasks FOR VALUES WITH (MODULUS 16, REMAINDER 14);
CREATE TABLE tasks_p15 PARTITION OF tasks FOR VALUES WITH (MODULUS 16, REMAINDER 15);

-- Indexes on partitioned table
CREATE INDEX idx_tasks_project_status ON tasks (project_id, status);
CREATE INDEX idx_tasks_status_priority ON tasks (status, priority DESC);
CREATE INDEX idx_tasks_created ON tasks (created_at DESC);
CREATE INDEX idx_tasks_input_data ON tasks USING GIN (input_data jsonb_path_ops);

-- =============================================================================
-- Task Assignments Table
-- =============================================================================

CREATE TABLE task_assignments (
    assignment_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id             UUID NOT NULL,
    project_id          UUID NOT NULL,
    step_id             VARCHAR(100) NOT NULL,
    user_id             UUID NOT NULL REFERENCES users(user_id),
    status              assignment_status NOT NULL DEFAULT 'assigned',
    assigned_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    accepted_at         TIMESTAMPTZ,
    submitted_at        TIMESTAMPTZ,
    time_spent_ms       BIGINT,
    assignment_metadata JSONB NOT NULL DEFAULT '{}',

    -- Foreign key to partitioned tasks table
    FOREIGN KEY (project_id, task_id) REFERENCES tasks(project_id, task_id) ON DELETE CASCADE,
    -- Prevent duplicate assignments for same user/task/step
    CONSTRAINT unique_user_task_step UNIQUE (task_id, step_id, user_id)
);

CREATE INDEX idx_assignments_user_status ON task_assignments (user_id, status);
CREATE INDEX idx_assignments_task ON task_assignments (task_id);
CREATE INDEX idx_assignments_project ON task_assignments (project_id);
CREATE INDEX idx_assignments_step ON task_assignments (step_id, status);
CREATE INDEX idx_assignments_assigned ON task_assignments (assigned_at DESC);

-- =============================================================================
-- Comments
-- =============================================================================

COMMENT ON TABLE tasks IS 'Tasks to be annotated, partitioned by project for scalability';
COMMENT ON TABLE task_assignments IS 'Assignment of tasks to users for specific workflow steps';
COMMENT ON COLUMN tasks.workflow_state IS 'Current state of the task in the workflow DAG';
COMMENT ON COLUMN tasks.input_data IS 'The data to be annotated (text, image URL, etc.)';
