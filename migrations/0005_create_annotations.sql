-- Glyph Data Annotation Platform
-- Migration 0005: Create annotations and events tables (partitioned)

-- =============================================================================
-- Annotations Table (Hash Partitioned by project_id)
-- =============================================================================

CREATE TABLE annotations (
    annotation_id       UUID NOT NULL DEFAULT gen_random_uuid(),
    task_id             UUID NOT NULL,
    step_id             VARCHAR(100) NOT NULL,
    user_id             UUID NOT NULL REFERENCES users(user_id),
    assignment_id       UUID NOT NULL REFERENCES task_assignments(assignment_id),
    project_id          UUID NOT NULL,

    data                JSONB NOT NULL,
    status              annotation_status NOT NULL DEFAULT 'draft',
    version             INT NOT NULL DEFAULT 1,
    parent_version_id   UUID,

    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    submitted_at        TIMESTAMPTZ,

    quality_score       DOUBLE PRECISION,
    quality_evaluated_at TIMESTAMPTZ,
    time_spent_ms       BIGINT,
    client_metadata     JSONB,

    PRIMARY KEY (project_id, annotation_id),
    CONSTRAINT valid_quality CHECK (quality_score IS NULL OR (quality_score >= 0 AND quality_score <= 1)),
    CONSTRAINT valid_version CHECK (version >= 1)
) PARTITION BY HASH (project_id);

-- Create 16 partitions
CREATE TABLE annotations_p0 PARTITION OF annotations FOR VALUES WITH (MODULUS 16, REMAINDER 0);
CREATE TABLE annotations_p1 PARTITION OF annotations FOR VALUES WITH (MODULUS 16, REMAINDER 1);
CREATE TABLE annotations_p2 PARTITION OF annotations FOR VALUES WITH (MODULUS 16, REMAINDER 2);
CREATE TABLE annotations_p3 PARTITION OF annotations FOR VALUES WITH (MODULUS 16, REMAINDER 3);
CREATE TABLE annotations_p4 PARTITION OF annotations FOR VALUES WITH (MODULUS 16, REMAINDER 4);
CREATE TABLE annotations_p5 PARTITION OF annotations FOR VALUES WITH (MODULUS 16, REMAINDER 5);
CREATE TABLE annotations_p6 PARTITION OF annotations FOR VALUES WITH (MODULUS 16, REMAINDER 6);
CREATE TABLE annotations_p7 PARTITION OF annotations FOR VALUES WITH (MODULUS 16, REMAINDER 7);
CREATE TABLE annotations_p8 PARTITION OF annotations FOR VALUES WITH (MODULUS 16, REMAINDER 8);
CREATE TABLE annotations_p9 PARTITION OF annotations FOR VALUES WITH (MODULUS 16, REMAINDER 9);
CREATE TABLE annotations_p10 PARTITION OF annotations FOR VALUES WITH (MODULUS 16, REMAINDER 10);
CREATE TABLE annotations_p11 PARTITION OF annotations FOR VALUES WITH (MODULUS 16, REMAINDER 11);
CREATE TABLE annotations_p12 PARTITION OF annotations FOR VALUES WITH (MODULUS 16, REMAINDER 12);
CREATE TABLE annotations_p13 PARTITION OF annotations FOR VALUES WITH (MODULUS 16, REMAINDER 13);
CREATE TABLE annotations_p14 PARTITION OF annotations FOR VALUES WITH (MODULUS 16, REMAINDER 14);
CREATE TABLE annotations_p15 PARTITION OF annotations FOR VALUES WITH (MODULUS 16, REMAINDER 15);

-- Indexes
CREATE INDEX idx_annotations_task ON annotations (task_id, step_id);
CREATE INDEX idx_annotations_user ON annotations (user_id, created_at DESC);
CREATE INDEX idx_annotations_project_status ON annotations (project_id, status, created_at DESC);
CREATE INDEX idx_annotations_submitted ON annotations (project_id, submitted_at DESC) WHERE status = 'submitted';
CREATE INDEX idx_annotations_data ON annotations USING GIN (data jsonb_path_ops);
CREATE INDEX idx_annotations_quality ON annotations (quality_score) WHERE quality_score IS NOT NULL;

-- =============================================================================
-- Annotation Events Table (Range Partitioned by time for event sourcing)
-- =============================================================================

CREATE TABLE annotation_events (
    event_id        UUID NOT NULL DEFAULT gen_random_uuid(),
    annotation_id   UUID NOT NULL,
    project_id      UUID NOT NULL,
    event_type      VARCHAR(50) NOT NULL,
    data_snapshot   JSONB NOT NULL,
    changes         JSONB,
    actor_id        UUID NOT NULL,
    actor_type      actor_type NOT NULL,
    occurred_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    request_id      UUID,
    ip_address      INET,
    user_agent      TEXT,

    PRIMARY KEY (occurred_at, event_id)
) PARTITION BY RANGE (occurred_at);

-- Create monthly partitions for 2025-2026
CREATE TABLE annotation_events_2025_01 PARTITION OF annotation_events
    FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');
CREATE TABLE annotation_events_2025_02 PARTITION OF annotation_events
    FOR VALUES FROM ('2025-02-01') TO ('2025-03-01');
CREATE TABLE annotation_events_2025_03 PARTITION OF annotation_events
    FOR VALUES FROM ('2025-03-01') TO ('2025-04-01');
CREATE TABLE annotation_events_2025_04 PARTITION OF annotation_events
    FOR VALUES FROM ('2025-04-01') TO ('2025-05-01');
CREATE TABLE annotation_events_2025_05 PARTITION OF annotation_events
    FOR VALUES FROM ('2025-05-01') TO ('2025-06-01');
CREATE TABLE annotation_events_2025_06 PARTITION OF annotation_events
    FOR VALUES FROM ('2025-06-01') TO ('2025-07-01');
CREATE TABLE annotation_events_2025_07 PARTITION OF annotation_events
    FOR VALUES FROM ('2025-07-01') TO ('2025-08-01');
CREATE TABLE annotation_events_2025_08 PARTITION OF annotation_events
    FOR VALUES FROM ('2025-08-01') TO ('2025-09-01');
CREATE TABLE annotation_events_2025_09 PARTITION OF annotation_events
    FOR VALUES FROM ('2025-09-01') TO ('2025-10-01');
CREATE TABLE annotation_events_2025_10 PARTITION OF annotation_events
    FOR VALUES FROM ('2025-10-01') TO ('2025-11-01');
CREATE TABLE annotation_events_2025_11 PARTITION OF annotation_events
    FOR VALUES FROM ('2025-11-01') TO ('2025-12-01');
CREATE TABLE annotation_events_2025_12 PARTITION OF annotation_events
    FOR VALUES FROM ('2025-12-01') TO ('2026-01-01');
CREATE TABLE annotation_events_2026_01 PARTITION OF annotation_events
    FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');
CREATE TABLE annotation_events_2026_02 PARTITION OF annotation_events
    FOR VALUES FROM ('2026-02-01') TO ('2026-03-01');
CREATE TABLE annotation_events_2026_03 PARTITION OF annotation_events
    FOR VALUES FROM ('2026-03-01') TO ('2026-04-01');

-- Indexes on events
CREATE INDEX idx_annotation_events_annotation ON annotation_events (annotation_id, occurred_at);
CREATE INDEX idx_annotation_events_actor ON annotation_events (actor_id, occurred_at DESC);
CREATE INDEX idx_annotation_events_type ON annotation_events (event_type, occurred_at DESC);
CREATE INDEX idx_annotation_events_project ON annotation_events (project_id, occurred_at DESC);

-- =============================================================================
-- Comments
-- =============================================================================

COMMENT ON TABLE annotations IS 'User annotations on tasks, partitioned by project';
COMMENT ON TABLE annotation_events IS 'Event sourcing log for complete audit trail, partitioned by month';
COMMENT ON COLUMN annotations.data IS 'The annotation data in JSONB format';
COMMENT ON COLUMN annotation_events.data_snapshot IS 'Complete state of annotation at event time';
COMMENT ON COLUMN annotation_events.changes IS 'Delta of changes made in this event';
