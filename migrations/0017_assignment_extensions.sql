-- Add columns for reject flow and cooldown
ALTER TABLE task_assignments ADD COLUMN IF NOT EXISTS reject_reason JSONB;
ALTER TABLE task_assignments ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMPTZ;

-- Add cooldown tracking to tasks
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS cooldown_until TIMESTAMPTZ;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS version BIGINT NOT NULL DEFAULT 1;

-- User presence tracking (for queue UI)
CREATE TABLE IF NOT EXISTS user_presence (
    user_id UUID NOT NULL REFERENCES users(user_id),
    project_id UUID NOT NULL REFERENCES projects(project_id),
    last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, project_id)
);

-- Index for efficient presence queries
CREATE INDEX IF NOT EXISTS idx_user_presence_project ON user_presence(project_id, last_seen_at DESC);
