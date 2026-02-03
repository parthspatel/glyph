# Plan 05-12 Summary: Wire ProjectType CRUD API

## Status: Complete

## What Was Built

Wired ProjectType CRUD API routes to the existing PgProjectTypeRepository implementation.

### Changes

**apps/api/src/routes/project_types.rs:**
- Added imports for `PgProjectTypeRepository`, `ProjectTypeRepository`, domain types
- Added `Extension<PgPool>` parameter to all handlers
- Implemented `From<ProjectType>` for `ProjectTypeResponse`
- Wired `list_project_types` to `repo.list()` with filter
- Wired `get_project_type` to `repo.find_by_id()`
- Wired `create_project_type` to `repo.create()` with validation
- Wired `update_project_type` to `repo.update()`
- Wired `delete_project_type` to `repo.delete()`
- Added helper functions: `format_difficulty`, `parse_difficulty`, `format_proficiency`, `parse_proficiency`

### API Endpoints Now Working

| Method | Path | Description |
|--------|------|-------------|
| GET | /api/v1/project-types | List project types with filters |
| GET | /api/v1/project-types/{id} | Get project type by ID |
| POST | /api/v1/project-types | Create project type |
| PUT | /api/v1/project-types/{id} | Update project type |
| DELETE | /api/v1/project-types/{id} | Delete project type |

## Commits

- `cfc48eb` feat(05-12): wire ProjectType CRUD and skill requirement routes

## Verification

- `cargo check -p glyph-api` passes
- All routes connect to PgProjectTypeRepository
- Error handling maps repository errors to HTTP status codes
