# Plan 05-11 Summary: Backend Repository Gap Closure

## Outcome
**Status:** Complete

## What Was Built
1. **Database Migration** (0013_project_columns.sql)
   - Made workflow_id and layout_id nullable (projects can exist in draft without these)
   - Added project_type_id, team_id, tags, documentation, deadline, deadline_action columns

2. **PgProjectRepository** (libs/db/src/repo/pg_project.rs)
   - Full implementation with 470 lines of code
   - CRUD operations: find_by_id, create, update, list, soft_delete
   - Extended methods: create_minimal(), update_extended()
   - Audit trail integration for all mutations
   - ProjectRow struct with TryFrom<ProjectRow> for Project conversion

3. **API Routes Wiring** (apps/api/src/routes/projects.rs)
   - Replaced all stub implementations with actual database operations
   - list_projects: uses repo.list() with pagination
   - get_project: uses repo.find_by_id()
   - create_project: uses repo.create_minimal() with optional extended update
   - update_project: uses repo.update_extended()
   - delete_project: uses repo.soft_delete()
   - update_status: validates transitions and uses repo.update()
   - activate_project: checks readiness and activates
   - clone_project: creates copy with optional settings

## Commits
| Hash | Message |
|------|---------|
| 4095dd0 | feat(db): add migration for nullable project columns |
| c2bcc8e | feat(db): implement PgProjectRepository with audit trail |
| 3fabefc | feat(api): wire project routes to PgProjectRepository |

## Files Changed
| File | Change |
|------|--------|
| migrations/0013_project_columns.sql | New - schema updates |
| libs/db/src/repo/pg_project.rs | New - 470 lines repository implementation |
| libs/db/src/repo/pg_stubs.rs | Removed PgProjectRepository stub |
| libs/db/src/repo/mod.rs | Added pg_project module export |
| apps/api/src/routes/projects.rs | Rewrote with actual DB operations |

## Gap Closed
- **Issue:** Project save returned 404 - routes were stubs returning mock data
- **Resolution:** Implemented full repository and wired all routes to database

## Deviations
- Removed PgProjectRepository stub from pg_stubs.rs to avoid ambiguous_glob_reexports warning

## Notes
The original routes were returning placeholder responses or 404 errors. Now all project CRUD operations persist to PostgreSQL with audit logging.
