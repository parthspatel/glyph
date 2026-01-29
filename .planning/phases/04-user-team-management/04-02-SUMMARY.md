# Plan 04-02 Summary: RBAC Permission Extractors

## Completed Tasks

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Add RequireAdmin extractor with verbose Forbidden | c5aafac | apps/api/src/error.rs, apps/api/src/extractors/require_admin.rs, apps/api/src/extractors/mod.rs |
| 2 | Add PermissionService with team hierarchy check | 1718763 | apps/api/src/services/mod.rs, apps/api/src/services/permission_service.rs, apps/api/src/lib.rs |
| 3 | Add RequireTeamLead extractor with cascade | 5a77f23 | apps/api/src/extractors/require_team_lead.rs, apps/api/src/extractors/mod.rs |

## Deliverables

- **ApiError::Forbidden { permission }**: Updated to include required permission string for verbose denial messages
- **RequireAdmin extractor**: Checks `user.has_role("admin")`, returns `Forbidden { permission: "role:admin" }`
- **PermissionService**: New service with team hierarchy checks via recursive CTE
  - `check_team_leadership_cascade()`: Checks if user leads team or any parent team
  - `check_team_membership()`: Checks if user is member of team (any role)
  - `can_certify_skills()`: Checks admin or skill:certifier role
- **RequireTeamLead extractor**: Extracts team_id from path, checks leadership cascade, admin bypass

## Key Decisions

- Used native async trait support (Rust 1.75+) instead of async_trait crate
- Team ID extracted from URL path by finding segment with `team_` prefix
- Admins automatically bypass team leadership checks (global override)

## Deviations

None.

## Verification

- `cargo check -p glyph-api` passes
- All extractors use consistent FromRequestParts pattern from current_user.rs
