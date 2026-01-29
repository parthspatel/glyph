-- Glyph Data Annotation Platform
-- Migration 0001: Create all enum types
-- These enums must match the Rust enums in crates/domain/src/enums.rs exactly

-- =============================================================================
-- Core Status Enums
-- =============================================================================

CREATE TYPE user_status AS ENUM ('active', 'inactive', 'suspended');

CREATE TYPE task_status AS ENUM (
    'pending',
    'assigned',
    'in_progress',
    'review',
    'adjudication',
    'completed',
    'failed',
    'cancelled'
);

CREATE TYPE annotation_status AS ENUM (
    'draft',
    'submitted',
    'approved',
    'rejected',
    'superseded'
);

CREATE TYPE assignment_status AS ENUM (
    'assigned',
    'accepted',
    'in_progress',
    'submitted',
    'expired',
    'reassigned'
);

CREATE TYPE step_type AS ENUM (
    'annotation',
    'review',
    'adjudication',
    'auto_process',
    'conditional',
    'sub_workflow'
);

CREATE TYPE step_status AS ENUM ('pending', 'active', 'completed', 'skipped');

CREATE TYPE actor_type AS ENUM ('user', 'system', 'api');

CREATE TYPE project_status AS ENUM (
    'draft',
    'active',
    'paused',
    'completed',
    'archived'
);

CREATE TYPE goal_type AS ENUM (
    'volume',
    'quality',
    'deadline',
    'duration',
    'composite',
    'manual'
);

CREATE TYPE quality_entity_type AS ENUM ('task', 'annotation', 'user', 'project');

-- =============================================================================
-- Workflow Configuration Enums
-- =============================================================================

CREATE TYPE workflow_type AS ENUM ('single', 'multi_adjudication', 'custom');

CREATE TYPE completion_criteria_type AS ENUM (
    'annotation_count',
    'review_decision',
    'auto',
    'manual'
);

CREATE TYPE consensus_method AS ENUM ('majority_vote', 'weighted_vote', 'unanimous');

CREATE TYPE resolution_strategy AS ENUM (
    'majority_vote',
    'weighted_vote',
    'adjudication',
    'additional_annotators',
    'escalate'
);

CREATE TYPE assignment_mode AS ENUM ('auto', 'manual', 'pool');

CREATE TYPE load_balancing_strategy AS ENUM (
    'round_robin',
    'least_loaded',
    'quality_weighted'
);

CREATE TYPE contribution_type AS ENUM ('count', 'quality_metric', 'progress');

CREATE TYPE aggregation_type AS ENUM ('sum', 'latest', 'average', 'min', 'max');

CREATE TYPE transition_condition_type AS ENUM (
    'always',
    'on_complete',
    'on_agreement',
    'on_disagreement',
    'expression'
);

CREATE TYPE timeout_action AS ENUM ('proceed', 'retry', 'escalate');

CREATE TYPE proficiency_level AS ENUM ('novice', 'intermediate', 'advanced', 'expert');

-- Team enums
CREATE TYPE team_status AS ENUM ('active', 'inactive', 'deleted');
CREATE TYPE team_role AS ENUM ('leader', 'member');
