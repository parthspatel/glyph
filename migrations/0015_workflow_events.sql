-- Workflow events table for event sourcing
-- Partitioned by occurred_at for efficient time-based queries and archival

CREATE TABLE workflow_events (
    event_id UUID NOT NULL,
    stream_id UUID NOT NULL,
    stream_type VARCHAR(100) NOT NULL,
    version BIGINT NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    event_data JSONB NOT NULL DEFAULT '{}',
    metadata JSONB NOT NULL DEFAULT '{}',
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (event_id, occurred_at)
) PARTITION BY RANGE (occurred_at);

-- Initial partitions for 2026
CREATE TABLE workflow_events_2026_02 PARTITION OF workflow_events
    FOR VALUES FROM ('2026-02-01') TO ('2026-03-01');

CREATE TABLE workflow_events_2026_03 PARTITION OF workflow_events
    FOR VALUES FROM ('2026-03-01') TO ('2026-04-01');

-- Optimistic concurrency: only one event per stream+version
CREATE UNIQUE INDEX idx_workflow_events_stream_version
    ON workflow_events (stream_id, version);

-- Query events by type and time
CREATE INDEX idx_workflow_events_type_time
    ON workflow_events (event_type, occurred_at);

-- Fast JSON queries on event_data (jsonb_path_ops for 40-50% smaller index)
CREATE INDEX idx_workflow_events_data_gin
    ON workflow_events USING GIN (event_data jsonb_path_ops);
