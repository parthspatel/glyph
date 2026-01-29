# Plan 04-05 Summary: Team CRUD API

## Status: Complete

## What Was Built

Team CRUD REST API with hierarchical structure support via parent_team_id and recursive CTE queries.

## Deliverables

| Deliverable | Status | Commit |
|-------------|--------|--------|
| TeamRepository trait with hierarchy methods | Done | 360fcb8 |
| PgTeamRepository with recursive CTE | Done | 360fcb8 |
| Team CRUD endpoints | Done | 360fcb8 |
| Team tree endpoint | Done | 360fcb8 |

## Key Technical Decisions

1. **Recursive CTE for hierarchy**: `get_team_tree()` uses PostgreSQL `WITH RECURSIVE` to traverse team hierarchy with depth tracking.

2. **parent_team_id for hierarchy**: Teams reference their parent via optional `parent_team_id`, allowing unlimited nesting depth.

3. **root_only filter**: List endpoint supports `?root_only=true` to return only top-level teams without parents.

4. **Leadership cascade for updates**: Team updates require either admin role or leadership in the team (checked via `PermissionService.check_team_leadership_cascade`).

## Files Changed

- `libs/db/src/repo/traits.rs` - Extended TeamRepository trait, added TeamTreeNode, TeamMembershipWithUser
- `libs/db/src/repo/pg_team.rs` - Full PostgreSQL implementation
- `libs/db/src/repo/pg_stubs.rs` - Removed stub TeamRepository
- `libs/db/src/repo/mod.rs` - Export PgTeamRepository
- `apps/api/src/routes/teams.rs` - Team endpoints
- `apps/api/src/routes/mod.rs` - Wire up team routes

## Endpoints Implemented

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | /api/v1/teams | CurrentUser | List teams (supports root_only) |
| GET | /api/v1/teams/{id} | CurrentUser | Get team with sub-teams |
| GET | /api/v1/teams/{id}/tree | CurrentUser | Get full hierarchy tree |
| POST | /api/v1/teams | RequireAdmin | Create team with optional parent |
| PATCH | /api/v1/teams/{id} | Leader or Admin | Update team |
| DELETE | /api/v1/teams/{id} | RequireAdmin | Soft-delete team |

## Verification

- `cargo check -p glyph-api` passes
- Team hierarchy queries use recursive CTE
- Leadership cascade permission check implemented
- Soft delete preserves data integrity
