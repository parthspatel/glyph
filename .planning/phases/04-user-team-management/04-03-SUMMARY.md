# Plan 04-03 Summary: User CRUD API

## Status: Complete

## What Was Built

Complete User CRUD REST API with detailed profiles and RBAC enforcement.

## Deliverables

| Deliverable | Status | Commit |
|-------------|--------|--------|
| Extended User domain with profile fields | Done | 905ca76 |
| Users table extension migration (0009) | Done | 86ef325 |
| User CRUD endpoints with RBAC | Done | fcfbf41 |

## Key Technical Decisions

1. **Extension pattern for database access**: Used `Extension<PgPool>` instead of typed State to match existing codebase patterns and allow routes to be composed without state dependencies.

2. **PgUserRepository instantiation per-request**: Repository is created from pool on each request rather than shared Arc. This is acceptable for request-scoped operations.

3. **utoipa feature flag for domain**: Added optional utoipa dependency to glyph-domain with feature flag to derive ToSchema for ContactInfo.

## Files Changed

- `libs/domain/src/user.rs` - Extended User with profile fields, added GlobalRole enum, ContactInfo struct
- `libs/domain/Cargo.toml` - Added optional utoipa dependency
- `libs/db/src/repo/traits.rs` - Extended NewUser and UserUpdate structs
- `libs/db/src/repo/pg_user.rs` - Updated queries for new columns
- `migrations/0009_extend_users.sql` - Added profile columns to users table
- `apps/api/src/routes/users.rs` - Complete CRUD endpoints
- `apps/api/Cargo.toml` - Enabled utoipa feature for glyph-domain

## Endpoints Implemented

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | /api/v1/users | CurrentUser | List users with pagination |
| GET | /api/v1/users/{id} | CurrentUser | Get user details |
| POST | /api/v1/users | RequireAdmin | Create new user |
| PATCH | /api/v1/users/{id} | Self or Admin | Update user profile |
| DELETE | /api/v1/users/{id} | RequireAdmin | Soft-delete user |

## Verification

- `cargo check -p glyph-api` passes without warnings
- All endpoints documented with utoipa for Swagger UI
- RBAC enforced via extractors (RequireAdmin, CurrentUser)

## Notes

Skills loading on user detail (get_user) is prepared but will be fully integrated with Plan 04-04 (Skills API).
