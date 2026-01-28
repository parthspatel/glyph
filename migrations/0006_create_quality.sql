-- Glyph Data Annotation Platform
-- Migration 0006: Create quality scoring and metrics tables

-- =============================================================================
-- Quality Scores Table
-- =============================================================================

CREATE TABLE quality_scores (
    score_id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type         quality_entity_type NOT NULL,
    entity_id           UUID NOT NULL,
    score_type          VARCHAR(50) NOT NULL,
    value               DOUBLE PRECISION NOT NULL,
    confidence          DOUBLE PRECISION,
    sample_size         INT NOT NULL DEFAULT 1,
    evaluator_id        VARCHAR(100),
    calculated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    calculation_metadata JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT valid_score CHECK (value >= 0 AND value <= 1),
    CONSTRAINT valid_confidence CHECK (confidence IS NULL OR (confidence >= 0 AND confidence <= 1)),
    CONSTRAINT valid_sample_size CHECK (sample_size >= 1)
);

CREATE INDEX idx_quality_scores_entity ON quality_scores (entity_type, entity_id);
CREATE INDEX idx_quality_scores_type ON quality_scores (score_type, calculated_at DESC);
CREATE INDEX idx_quality_scores_evaluator ON quality_scores (evaluator_id) WHERE evaluator_id IS NOT NULL;

-- =============================================================================
-- Assignment Metrics Table (instrumentation data)
-- =============================================================================

CREATE TABLE assignment_metrics (
    assignment_id       UUID PRIMARY KEY REFERENCES task_assignments(assignment_id) ON DELETE CASCADE,
    user_id             UUID NOT NULL REFERENCES users(user_id),
    task_id             UUID NOT NULL,
    step_id             VARCHAR(100) NOT NULL,

    -- Time metrics
    total_time_ms       BIGINT NOT NULL DEFAULT 0,
    active_time_ms      BIGINT NOT NULL DEFAULT 0,
    idle_time_ms        BIGINT NOT NULL DEFAULT 0,
    focus_time_ms       BIGINT NOT NULL DEFAULT 0,

    -- Interaction counts
    total_interactions  INT NOT NULL DEFAULT 0,
    keystrokes          INT NOT NULL DEFAULT 0,
    clicks              INT NOT NULL DEFAULT 0,
    selections          INT NOT NULL DEFAULT 0,
    scroll_events       INT NOT NULL DEFAULT 0,

    -- Annotation activity
    entities_created    INT NOT NULL DEFAULT 0,
    entities_deleted    INT NOT NULL DEFAULT 0,
    entities_modified   INT NOT NULL DEFAULT 0,
    relations_created   INT NOT NULL DEFAULT 0,
    fields_changed      INT NOT NULL DEFAULT 0,
    undo_count          INT NOT NULL DEFAULT 0,
    redo_count          INT NOT NULL DEFAULT 0,

    -- Quality indicators
    corrections_count   INT NOT NULL DEFAULT 0,
    revision_cycles     INT NOT NULL DEFAULT 0,

    -- Help usage
    validation_errors   INT NOT NULL DEFAULT 0,
    hints_viewed        INT NOT NULL DEFAULT 0,
    guidelines_accessed INT NOT NULL DEFAULT 0,

    -- Computed metrics
    actions_per_minute  DECIMAL(8,2),
    avg_time_per_entity_ms BIGINT,

    computed_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_assignment_metrics_user ON assignment_metrics (user_id);
CREATE INDEX idx_assignment_metrics_task ON assignment_metrics (task_id);
CREATE INDEX idx_assignment_metrics_computed ON assignment_metrics (computed_at DESC);

-- =============================================================================
-- Materialized View: Daily Annotation Stats
-- =============================================================================

CREATE MATERIALIZED VIEW mv_daily_annotation_stats AS
SELECT
    date_trunc('day', submitted_at) AS day,
    project_id,
    user_id,
    COUNT(*) AS annotation_count,
    AVG(quality_score) AS avg_quality,
    AVG(time_spent_ms) AS avg_time_ms,
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY time_spent_ms) AS median_time_ms,
    MIN(submitted_at) AS first_submission,
    MAX(submitted_at) AS last_submission
FROM annotations
WHERE status = 'submitted' AND submitted_at IS NOT NULL
GROUP BY 1, 2, 3;

CREATE UNIQUE INDEX ON mv_daily_annotation_stats (day, project_id, user_id);
CREATE INDEX ON mv_daily_annotation_stats (project_id, day DESC);
CREATE INDEX ON mv_daily_annotation_stats (user_id, day DESC);

-- =============================================================================
-- Materialized View: User Quality Summary
-- =============================================================================

CREATE MATERIALIZED VIEW mv_user_quality_summary AS
SELECT
    u.user_id,
    u.display_name,
    COUNT(DISTINCT a.annotation_id) AS total_annotations,
    COUNT(DISTINCT a.annotation_id) FILTER (WHERE a.status = 'approved') AS approved_count,
    COUNT(DISTINCT a.annotation_id) FILTER (WHERE a.status = 'rejected') AS rejected_count,
    AVG(a.quality_score) FILTER (WHERE a.quality_score IS NOT NULL) AS avg_quality_score,
    AVG(a.time_spent_ms) AS avg_time_ms,
    COUNT(DISTINCT a.project_id) AS projects_count
FROM users u
LEFT JOIN annotations a ON u.user_id = a.user_id AND a.status IN ('submitted', 'approved', 'rejected')
GROUP BY u.user_id, u.display_name;

CREATE UNIQUE INDEX ON mv_user_quality_summary (user_id);

-- =============================================================================
-- Comments
-- =============================================================================

COMMENT ON TABLE quality_scores IS 'Quality scores for various entities (tasks, annotations, users, projects)';
COMMENT ON TABLE assignment_metrics IS 'Detailed instrumentation metrics collected during annotation';
COMMENT ON MATERIALIZED VIEW mv_daily_annotation_stats IS 'Pre-aggregated daily statistics for dashboards';
COMMENT ON MATERIALIZED VIEW mv_user_quality_summary IS 'Per-user quality and productivity summary';
