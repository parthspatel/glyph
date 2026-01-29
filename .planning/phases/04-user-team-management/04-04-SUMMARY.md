# Plan 04-04 Summary: Skills API

## Status: Complete

## What Was Built

Skill type configuration and user skill certification API with dynamic expiration status.

## Deliverables

| Deliverable | Status | Commit |
|-------------|--------|--------|
| SkillRepository trait and types | Done | f38a92f |
| PgSkillRepository implementation | Done | f38a92f |
| Skill type endpoints (admin) | Done | f38a92f |
| User skill certification endpoints | Done | f38a92f |

## Key Technical Decisions

1. **Extension<PgPool> pattern**: Consistent with users.rs, instantiate repository per-request from pool extension.

2. **ON CONFLICT for re-certification**: When certifying an already-certified skill, the certification is updated rather than erroring. This supports recertification workflows.

3. **PermissionService for certification check**: `can_certify_skills()` checks for admin or skill:certifier role.

## Files Changed

- `libs/db/src/repo/errors.rs` - Added skill error types
- `libs/db/src/repo/traits.rs` - Added SkillRepository trait and input types
- `libs/db/src/repo/pg_skill.rs` - PostgreSQL implementation
- `libs/db/src/repo/mod.rs` - Export PgSkillRepository
- `libs/db/Cargo.toml` - Added uuid dependency
- `apps/api/src/routes/skills.rs` - Skill endpoints
- `apps/api/src/routes/mod.rs` - Wire up skill routes

## Endpoints Implemented

### Skill Types (Admin only for mutations)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | /api/v1/skills/types | CurrentUser | List all skill types |
| GET | /api/v1/skills/types/{id} | CurrentUser | Get skill type details |
| POST | /api/v1/skills/types | RequireAdmin | Create skill type |
| PATCH | /api/v1/skills/types/{id} | RequireAdmin | Update skill type |

### User Skills (Certifier role required for mutations)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | /api/v1/users/{id}/skills | CurrentUser | List user's skills |
| POST | /api/v1/users/{id}/skills/{skill} | Certifier | Certify skill |
| DELETE | /api/v1/users/{id}/skills/{skill} | Certifier | Revoke skill |

## Verification

- `cargo check -p glyph-api` passes
- Skill types support expiration_months and grace_period_days
- User skills use the user_skills_with_status view for dynamic status
- Proficiency validation enforced when requires_proficiency is true
