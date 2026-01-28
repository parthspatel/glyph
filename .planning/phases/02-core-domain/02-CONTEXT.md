# Phase 2: Core Domain - Context

**Gathered:** 2026-01-28
**Status:** Ready for planning

<domain>
## Phase Boundary

Implement all domain models, database schema, repository layer, and API skeleton for the data annotation platform. This phase establishes the foundational data structures that all subsequent phases build upon. Does not include business logic, authentication, or UI — only the structural foundation.

</domain>

<decisions>
## Implementation Decisions

### ID Strategy
- UUID v7 for time-ordered, sortable identifiers
- Singular noun prefix with underscore separator: `user_`, `project_`, `task_`, `annotation_`
- Full prefixed string stored in database (e.g., `user_01961a8e-7d3a-7f1c-9b2e-4a5c6d7e8f90`)
- Parsing: `split("_")` → `(noun, uuidv7)`

### Soft Delete & Archiving
- Status enum on all entities includes `deleted` state (not a separate `deleted_at` column)
- Event-sourced archiving with two tiers:
  - **Short-term:** PostgreSQL (fast undo operations)
  - **Long-term:** S3/blob cold storage (slow resurrection)
- Lifecycle: soft delete → manual archive action → configurable X-day cron for auto-archive
- **Manual purge only** — requires dependency analysis, user provides directives for broken trails
- **Full subgraph resurrection** — restores entire dependency tree from event log

### Audit Trail
- **Field-level granularity** — track all field changes to enable full database reconstruction at any point in time
- **Log all API calls** — complete audit trail, including reads (noisy but complete)
- **Hybrid storage format:**
  - Structured columns: `actor_id`, `action`, `entity_type`, `entity_id`, `timestamp`
  - Full event payload in JSONB for replay capability
- **System actor:** Cron jobs, workflow engine, auto-assignments logged as `actor_id = system`

### API Error Format
- **HTTP status + domain + hierarchical error codes** — e.g., `404` + `task.assignment.not_found`
- **Always include `trace_id`** in every error response for correlation
- **Accept header driven detail level:**
  - `Accept: application/problem+json` → full detailed response
  - Default → user-friendly simple format
- **Research needed:** Deeper error design architecture (RFC 7807 for HTTP layer, internal patterns TBD)

### Timestamp Handling
- **Store as UTC** — all timestamps in database are UTC
- **Millisecond precision** — sufficient for event ordering

### Multi-tenancy
- **Single tenant for v1** — no tenant isolation complexity

### Schema Versioning
- **Storage/events:** Tagged enums for durability
  ```rust
  #[derive(Serialize, Deserialize)]
  #[serde(tag = "schema_version")]
  enum MyType {
      V1(MyTypeV1),
      V2(MyTypeV2),
  }
  ```
- **API contracts:** Version in URL path (`/api/v1`, `/api/v2`), types stable within version

### Repository Pattern
- **Transactional multi-entity operations** — unit of work is a "logical" transaction from the user
- **Simple pagination:** offset/limit with single sort field
- **Explicit methods** — no generic query builder, add cursor-based pagination later if needed

### TypeScript Generation
- **Export:** Domain entities, enums, API request/response DTOs, error types
- **Don't export:** Internal repository types, database row mappers, server config
- **Nullable handling:** `T | null` with Tsify for WASM compatibility

### Database Naming Conventions
- **Table names:** Plural (`users`, `projects`, `tasks`)
- **Column names:** snake_case (`created_at`, `schema_version`)
- **Foreign keys:** Explicit names (`created_by_user_id`, `assigned_to_user_id`)

### Claude's Discretion
- Connection pooling configuration
- OpenAPI/utoipa setup details
- Exact audit table schema
- Event storage table partitioning strategy

</decisions>

<specifics>
## Specific Ideas

- Error design research resources provided:
  - https://home.expurple.me/posts/designing-error-types-in-rust-applications/
  - https://sabrinajewson.org/blog/errors
  - https://kerkour.com/rust-organize-errors-large-projects
- Audit trail designed to build event/edit graph for AI systems
- Resurrection mechanism must handle full dependency trees

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 02-core-domain*
*Context gathered: 2026-01-28*
