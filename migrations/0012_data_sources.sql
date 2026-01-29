-- Glyph Data Annotation Platform
-- Migration 0012: Create data_sources tables

-- =============================================================================
-- Enums
-- =============================================================================

CREATE TYPE data_source_type AS ENUM (
    'file_upload',
    's3',
    'gcs',
    'azure_blob',
    'api'
);

CREATE TYPE validation_mode AS ENUM (
    'strict',
    'lenient'
);

-- =============================================================================
-- Data Sources Table
-- =============================================================================

CREATE TABLE data_sources (
    data_source_id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id          UUID NOT NULL REFERENCES projects(project_id) ON DELETE CASCADE,
    name                VARCHAR(255) NOT NULL,
    source_type         data_source_type NOT NULL,
    config              JSONB NOT NULL DEFAULT '{}',
    validation_mode     validation_mode NOT NULL DEFAULT 'strict',
    last_sync_at        TIMESTAMPTZ,
    item_count          INTEGER DEFAULT 0,
    error_count         INTEGER DEFAULT 0,
    is_active           BOOLEAN NOT NULL DEFAULT true,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(project_id, name)
);

CREATE INDEX idx_data_sources_project ON data_sources (project_id);
CREATE INDEX idx_data_sources_type ON data_sources (source_type);
CREATE INDEX idx_data_sources_active ON data_sources (is_active);
CREATE INDEX idx_data_sources_last_sync ON data_sources (last_sync_at) WHERE last_sync_at IS NOT NULL;

CREATE TRIGGER update_data_sources_updated_at
    BEFORE UPDATE ON data_sources
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- Data Source Credentials Table
-- =============================================================================

CREATE TABLE data_source_credentials (
    credential_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    data_source_id      UUID NOT NULL REFERENCES data_sources(data_source_id) ON DELETE CASCADE,
    credential_type     VARCHAR(50) NOT NULL,
    encrypted_value     BYTEA NOT NULL,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_data_source_credentials_source ON data_source_credentials (data_source_id);

CREATE TRIGGER update_data_source_credentials_updated_at
    BEFORE UPDATE ON data_source_credentials
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- Comments
-- =============================================================================

COMMENT ON TABLE data_sources IS 'External data sources for projects (cloud storage, APIs, file uploads)';
COMMENT ON TABLE data_source_credentials IS 'Encrypted credentials for data source authentication';
COMMENT ON TYPE data_source_type IS 'Supported data source types';
COMMENT ON TYPE validation_mode IS 'Schema validation strictness level';
