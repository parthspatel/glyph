# Plan 04-01 Summary: Teams & Skills Schema

## Completed Tasks

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Create teams and memberships migration | b804511 | migrations/0001_create_enums.sql, migrations/0007_create_teams.sql |
| 2 | Create skills certification migration | e12ac71 | migrations/0008_create_skills.sql |
| 3 | Update domain types for teams and skills | 8061ed5 | libs/domain/src/team.rs, libs/domain/src/user.rs, libs/domain/src/enums.rs |

## Deliverables

- **Teams table**: Hierarchical structure via `parent_team_id`, with status, capacity, and specializations
- **Team memberships**: Many-to-many linking users to teams with role (leader/member) and allocation percentage
- **Skill types table**: Admin-configurable templates with expiration rules and proficiency levels
- **User skills table**: Normalized certifications with certified_by, expires_at tracking
- **user_skills_with_status view**: Dynamic status computation (active/soft_expired/hard_expired/never_expires)
- **Domain types**: Updated Team (removed leader_id, added parent_team_id), simplified TeamRole to Leader/Member
- **New types**: SkillType, UserSkillCertification with status() method, SkillStatus enum

## Key Decisions

- Removed `Manager` from TeamRole — leadership cascades through hierarchy instead
- Removed `leader_id` from Team — leadership determined via TeamMembership with role=Leader
- Skill status computed dynamically in view, never stored (prevents stale data)

## Deviations

None.

## Verification

- `cargo check -p glyph-domain` passes
- All migrations created with proper foreign keys and indexes
