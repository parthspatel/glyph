-- Glyph Data Annotation Platform
-- Migration 0009: Extend users table with profile details

-- Add new columns for detailed profiles
ALTER TABLE users
    ADD COLUMN IF NOT EXISTS auth0_id VARCHAR(255) UNIQUE,
    ADD COLUMN IF NOT EXISTS timezone VARCHAR(50),
    ADD COLUMN IF NOT EXISTS department VARCHAR(255),
    ADD COLUMN IF NOT EXISTS bio TEXT,
    ADD COLUMN IF NOT EXISTS avatar_url TEXT,
    ADD COLUMN IF NOT EXISTS contact_info JSONB NOT NULL DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS global_role VARCHAR(20) NOT NULL DEFAULT 'user';

-- Index for Auth0 lookup (SSO auto-provision)
CREATE INDEX IF NOT EXISTS idx_users_auth0_id ON users (auth0_id) WHERE auth0_id IS NOT NULL;

-- Index for department filtering
CREATE INDEX IF NOT EXISTS idx_users_department ON users (department) WHERE department IS NOT NULL;

-- Comment updates
COMMENT ON COLUMN users.auth0_id IS 'Auth0 subject identifier for SSO users';
COMMENT ON COLUMN users.timezone IS 'User timezone, e.g., America/New_York';
COMMENT ON COLUMN users.contact_info IS 'Additional contact details: {phone, slack_handle, office_location}';
COMMENT ON COLUMN users.global_role IS 'Global role: admin or user';
