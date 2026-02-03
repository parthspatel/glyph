# Plan 05-15 Summary: Wire DataSource API Routes

## Status: Complete

## What Was Built

Wired DataSource API routes to PgDataSourceRepository.

### Changes

**apps/api/src/routes/data_sources.rs:**
- Added imports for `PgDataSourceRepository`, `DataSourceRepository`, domain types
- Added `Extension<PgPool>` parameter to all handlers
- Implemented `From<DataSource>` for `DataSourceResponse`
- Wired `list_data_sources` to `repo.list()` with filter
- Wired `get_data_source` to `repo.find_by_id()`
- Wired `create_data_source` to `repo.create()` with config parsing
- Wired `update_data_source` to `repo.update()`
- Wired `delete_data_source` to `repo.delete()`
- Updated `test_connection` to verify data source exists, return type-based response
- Updated auxiliary routes to verify data source exists before operation
- Added `parse_config()` helper for all source types (FileUpload, S3, GCS, AzureBlob, Api)

### API Endpoints Now Working

| Method | Path | Description |
|--------|------|-------------|
| GET | /api/v1/projects/{id}/data-sources | List data sources |
| GET | /api/v1/projects/{id}/data-sources/{ds_id} | Get data source |
| POST | /api/v1/projects/{id}/data-sources | Create data source |
| PUT | /api/v1/projects/{id}/data-sources/{ds_id} | Update data source |
| DELETE | /api/v1/projects/{id}/data-sources/{ds_id} | Delete data source |
| POST | /api/v1/projects/{id}/data-sources/{ds_id}/test | Test connection (stub) |
| GET | /api/v1/projects/{id}/data-sources/{ds_id}/files | List files (stub) |
| PUT | /api/v1/projects/{id}/data-sources/{ds_id}/credentials | Update credentials (stub) |
| POST | /api/v1/projects/{id}/data-sources/{ds_id}/sync | Trigger sync (501) |

## Commits

- `34a1755` feat(05-15): wire DataSource API routes to PgDataSourceRepository

## Verification

- `cargo check -p glyph-api` passes
- All DataSource routes connect to PgDataSourceRepository
- Config parsing handles all source types
- Error handling maps repository errors to HTTP codes
