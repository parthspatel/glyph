-- Glyph Data Annotation Platform
-- Migration 0007: Create teams and memberships tables

-- Teams with hierarchy support
CREATE TABLE teams (
    team_id         UUID PRIMARY KEY,
    parent_team_id  UUID REFERENCES teams(team_id),
    name            VARCHAR(255) NOT NULL,
    description     TEXT,
    status          team_status NOT NULL DEFAULT 'active',
    capacity        INTEGER,
    specializations JSONB NOT NULL DEFAULT '[]',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for hierarchy traversal and filtering
CREATE INDEX idx_teams_parent ON teams (parent_team_id);
CREATE INDEX idx_teams_status ON teams (status);
CREATE INDEX idx_teams_name ON teams (name);

-- Team memberships (many-to-many with role)
CREATE TABLE team_memberships (
    team_id         UUID NOT NULL REFERENCES teams(team_id) ON DELETE CASCADE,
    user_id         UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    role            team_role NOT NULL DEFAULT 'member',
    allocation_percentage INTEGER CHECK (allocation_percentage >= 0 AND allocation_percentage <= 100),
    joined_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (team_id, user_id)
);

CREATE INDEX idx_team_memberships_user ON team_memberships (user_id);
CREATE INDEX idx_team_memberships_role ON team_memberships (role);

-- Trigger for teams updated_at
CREATE TRIGGER update_teams_updated_at
    BEFORE UPDATE ON teams
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Comments
COMMENT ON TABLE teams IS 'Hierarchical teams with optional parent relationships';
COMMENT ON COLUMN teams.parent_team_id IS 'Reference to parent team for hierarchy, NULL for root teams';
COMMENT ON TABLE team_memberships IS 'User membership in teams with role (leader or member)';
