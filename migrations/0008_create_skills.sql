-- Glyph Data Annotation Platform
-- Migration 0008: Create skill types and user skills tables

-- Skill types (admin-configured templates)
CREATE TABLE skill_types (
    skill_id            VARCHAR(50) PRIMARY KEY,
    name                VARCHAR(255) NOT NULL,
    description         TEXT,
    expiration_months   INTEGER,  -- NULL = never expires
    grace_period_days   INTEGER NOT NULL DEFAULT 0,
    requires_proficiency BOOLEAN NOT NULL DEFAULT FALSE,
    proficiency_levels  JSONB,  -- Ordered array e.g., ["novice", "intermediate", "expert"]
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- User skill certifications (normalized from users.skills JSONB)
CREATE TABLE user_skills (
    certification_id    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    skill_id            VARCHAR(50) NOT NULL REFERENCES skill_types(skill_id) ON DELETE CASCADE,
    proficiency_level   VARCHAR(50),  -- Must match entry in skill_types.proficiency_levels if requires_proficiency
    certified_by        UUID REFERENCES users(user_id),
    certified_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at          TIMESTAMPTZ,  -- Computed from skill_types.expiration_months at certification time
    notes               TEXT,
    UNIQUE (user_id, skill_id)
);

CREATE INDEX idx_user_skills_user ON user_skills (user_id);
CREATE INDEX idx_user_skills_skill ON user_skills (skill_id);
CREATE INDEX idx_user_skills_certified_by ON user_skills (certified_by);
CREATE INDEX idx_user_skills_expiry ON user_skills (expires_at) WHERE expires_at IS NOT NULL;

-- Trigger for skill_types updated_at
CREATE TRIGGER update_skill_types_updated_at
    BEFORE UPDATE ON skill_types
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- View computing skill status dynamically (never store computed status)
CREATE VIEW user_skills_with_status AS
SELECT
    us.certification_id,
    us.user_id,
    us.skill_id,
    us.proficiency_level,
    us.certified_by,
    us.certified_at,
    us.expires_at,
    us.notes,
    st.name as skill_name,
    st.grace_period_days,
    CASE
        WHEN us.expires_at IS NULL THEN 'never_expires'
        WHEN NOW() < us.expires_at THEN 'active'
        WHEN NOW() < us.expires_at + (INTERVAL '1 day' * st.grace_period_days) THEN 'soft_expired'
        ELSE 'hard_expired'
    END as status
FROM user_skills us
JOIN skill_types st ON us.skill_id = st.skill_id;

-- Comments
COMMENT ON TABLE skill_types IS 'Admin-configured skill templates with expiration rules';
COMMENT ON COLUMN skill_types.proficiency_levels IS 'Ordered array of proficiency level names, user-defined per skill';
COMMENT ON TABLE user_skills IS 'User skill certifications, one per skill per user';
COMMENT ON VIEW user_skills_with_status IS 'User skills with dynamically computed expiration status';
