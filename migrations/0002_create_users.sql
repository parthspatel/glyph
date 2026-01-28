-- Glyph Data Annotation Platform
-- Migration 0002: Create users table

-- =============================================================================
-- Users Table
-- =============================================================================

CREATE TABLE users (
    user_id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email           VARCHAR(255) NOT NULL UNIQUE,
    display_name    VARCHAR(255) NOT NULL,
    status          user_status NOT NULL DEFAULT 'active',
    skills          JSONB NOT NULL DEFAULT '[]',
    roles           JSONB NOT NULL DEFAULT '[]',
    quality_profile JSONB NOT NULL DEFAULT '{}',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_users_email ON users (email);
CREATE INDEX idx_users_status ON users (status);
CREATE INDEX idx_users_skills ON users USING GIN (skills);
CREATE INDEX idx_users_roles ON users USING GIN (roles);

-- =============================================================================
-- Trigger for auto-updating updated_at
-- =============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- Comments
-- =============================================================================

COMMENT ON TABLE users IS 'User accounts for annotators, reviewers, and administrators';
COMMENT ON COLUMN users.skills IS 'Array of {skill_id, proficiency, verified, verified_at}';
COMMENT ON COLUMN users.quality_profile IS 'Aggregated quality metrics for the user';
