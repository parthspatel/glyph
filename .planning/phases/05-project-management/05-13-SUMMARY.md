# Plan 05-13 Summary: Wire Skill Requirement Routes

## Status: Complete

## What Was Built

Wired skill requirement API routes to PgProjectTypeRepository skill methods.

### Changes

**apps/api/src/routes/project_types.rs:**
- Wired `add_skill_requirement` to `repo.add_skill_requirement()`
  - Accepts `Extension<PgPool>` parameter
  - Builds `SkillRequirement` from request
  - Returns 201 on success
- Wired `remove_skill_requirement` to `repo.remove_skill_requirement()`
  - Accepts `Extension<PgPool>` parameter
  - Returns 204 on success, 404 if not found

### API Endpoints Now Working

| Method | Path | Description |
|--------|------|-------------|
| POST | /api/v1/project-types/{id}/skills | Add skill requirement |
| DELETE | /api/v1/project-types/{id}/skills/{skill_id} | Remove skill requirement |

## Commits

- `cfc48eb` feat(05-12): wire ProjectType CRUD and skill requirement routes

(Combined with plan 05-12 in single commit as both modify same file)

## Verification

- `cargo check -p glyph-api` passes
- Skill requirements can be added and removed via API
- Proper error handling (404 for missing project type or skill)
