-- Workflow snapshots for event sourcing optimization
-- Stores periodic state snapshots to avoid replaying all events
-- Per RESEARCH.md: snapshot every 50 events for performance

CREATE TABLE workflow_snapshots (
    snapshot_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stream_id UUID NOT NULL,
    stream_type VARCHAR(100) NOT NULL,
    version BIGINT NOT NULL,
    state JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Only one snapshot per stream+version
    CONSTRAINT uq_workflow_snapshots_stream_version
        UNIQUE (stream_id, version)
);

-- Find latest snapshot for a stream (ORDER BY version DESC)
CREATE INDEX idx_workflow_snapshots_stream_version
    ON workflow_snapshots (stream_id, version DESC);

-- Cleanup old snapshots by date
CREATE INDEX idx_workflow_snapshots_created_at
    ON workflow_snapshots (created_at);
