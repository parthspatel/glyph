# Phase 2: Core Domain - Research

**Researched:** 2026-01-28
**Domain:** Domain modeling, database schema, repository pattern, API skeleton
**Confidence:** HIGH

## Summary

This research covers implementing the core domain layer for a data annotation platform, including prefixed UUID v7 identifiers, SQLx-backed repositories with custom types, event-sourced audit trails, hierarchical error handling with RFC 7807 support, and TypeScript type generation.

The existing codebase has substantial scaffolding from Phase 1: domain types are defined in `libs/domain/src/`, migrations exist for all core tables (users, projects, tasks, annotations, quality), and the API skeleton uses Axum with versioned routes (`/api/v1`). This phase completes the implementation by adding prefixed IDs, repository traits, and proper error architecture.

**Primary recommendation:** Implement prefixed UUIDs as newtype wrappers with SQLx `Type` derives, use `problem_details` crate for RFC 7807 errors, adopt the "error per function" pattern for domain errors, and use `utoipa-axum`'s `OpenApiRouter` for simultaneous route registration and OpenAPI generation.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `uuid` | 1.11+ | UUID v7 generation | Native v7 support with `now_v7()`, already in workspace |
| `sqlx` | 0.8 | Async database access | Already configured with postgres, uuid, chrono, json features |
| `utoipa` | 5.x | OpenAPI generation | Code-first, compile-time, Axum integration |
| `utoipa-axum` | 0.2+ | Axum router integration | `OpenApiRouter` eliminates duplication |
| `typeshare` | 1.0 | TypeScript generation | Already in workspace, 1Password maintained |
| `problem_details` | 0.4+ | RFC 7807/9457 errors | Native Axum integration, typed extensions |
| `thiserror` | 2.0 | Error derivation | Already in workspace, standard for domain errors |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `utoipa-swagger-ui` | 8.x | Swagger UI serving | Development/staging API docs |
| `utoipa-scalar` | 0.2+ | Scalar API docs | Modern alternative to Swagger UI |
| `async-trait` | 0.1 | Async trait support | Repository trait definitions |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `typeshare` | `ts-rs` | ts-rs has more options but less maintained |
| `problem_details` | Custom implementation | Crate handles content-type, serialization automatically |
| `utoipa` | `aide` | aide is newer but less ecosystem support |

**Installation (add to workspace Cargo.toml):**
```toml
[workspace.dependencies]
# Add v7 feature to uuid
uuid = { version = "1.11", features = ["v4", "v7", "serde"] }

# OpenAPI
utoipa = { version = "5", features = ["axum_extras", "uuid", "chrono"] }
utoipa-axum = "0.2"
utoipa-swagger-ui = { version = "8", features = ["axum"] }

# Error handling
problem_details = { version = "0.4", features = ["axum"] }
```

## Architecture Patterns

### Recommended Project Structure
```
libs/domain/src/
├── ids/                 # Prefixed ID types
│   ├── mod.rs
│   ├── user_id.rs
│   ├── project_id.rs
│   └── ...
├── entities/            # Domain entities (existing files move here)
│   ├── mod.rs
│   ├── user.rs
│   └── ...
├── events/              # Audit event types
│   ├── mod.rs
│   └── audit.rs
├── errors/              # Domain error types
│   ├── mod.rs
│   ├── user.rs         # Errors for user operations
│   └── ...
├── enums.rs             # (existing)
└── lib.rs

libs/db/src/
├── repositories/        # Repository implementations
│   ├── mod.rs
│   ├── traits.rs       # Repository traits
│   ├── user.rs
│   ├── project.rs
│   └── ...
├── audit/               # Audit trail implementation
│   ├── mod.rs
│   └── writer.rs
├── pool.rs              # (existing)
└── lib.rs

apps/api/src/
├── v1/                  # API v1 handlers
│   ├── mod.rs
│   ├── users.rs
│   ├── projects.rs
│   └── ...
├── error.rs             # API error types with RFC 7807
├── extractors/          # (existing)
├── middleware/          # (existing)
└── routes/              # Route composition
```

### Pattern 1: Prefixed UUID Type
**What:** Newtype wrapper for entity IDs with prefix validation
**When to use:** All entity identifiers
**Example:**
```rust
// Source: SQLx docs + uuid crate
use sqlx::{Decode, Encode, Type};
use std::str::FromStr;
use uuid::Uuid;

#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub struct UserId(Uuid);

impl UserId {
    const PREFIX: &'static str = "user";
    
    pub fn new() -> Self {
        Self(Uuid::now_v7())
    }
    
    pub fn from_uuid(uuid: Uuid) -> Self {
        Self(uuid)
    }
    
    pub fn as_uuid(&self) -> &Uuid {
        &self.0
    }
}

impl std::fmt::Display for UserId {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}_{}", Self::PREFIX, self.0)
    }
}

impl FromStr for UserId {
    type Err = IdParseError;
    
    fn from_str(s: &str) -> Result<Self, Self::Err> {
        let (prefix, uuid_str) = s.split_once('_')
            .ok_or(IdParseError::MissingPrefix)?;
        if prefix != Self::PREFIX {
            return Err(IdParseError::WrongPrefix { 
                expected: Self::PREFIX, 
                got: prefix.to_string() 
            });
        }
        let uuid = Uuid::parse_str(uuid_str)?;
        Ok(Self(uuid))
    }
}

// SQLx integration - store as TEXT
impl<'r> Decode<'r, sqlx::Postgres> for UserId {
    fn decode(value: sqlx::postgres::PgValueRef<'r>) -> Result<Self, sqlx::error::BoxDynError> {
        let s: &str = Decode::decode(value)?;
        Ok(s.parse()?)
    }
}

impl Encode<'_, sqlx::Postgres> for UserId {
    fn encode_by_ref(&self, buf: &mut sqlx::postgres::PgArgumentBuffer) -> Result<sqlx::encode::IsNull, sqlx::error::BoxDynError> {
        self.to_string().encode_by_ref(buf)
    }
}

impl Type<sqlx::Postgres> for UserId {
    fn type_info() -> sqlx::postgres::PgTypeInfo {
        <String as Type<sqlx::Postgres>>::type_info()
    }
}

// Serde - serialize as prefixed string
impl serde::Serialize for UserId {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where S: serde::Serializer {
        serializer.serialize_str(&self.to_string())
    }
}

impl<'de> serde::Deserialize<'de> for UserId {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where D: serde::Deserializer<'de> {
        let s = String::deserialize(deserializer)?;
        s.parse().map_err(serde::de::Error::custom)
    }
}
```

### Pattern 2: Repository Trait with Transaction Support
**What:** Async repository traits with explicit transaction boundaries
**When to use:** All database operations
**Example:**
```rust
// Source: async-trait pattern
use async_trait::async_trait;
use sqlx::PgPool;

#[async_trait]
pub trait UserRepository: Send + Sync {
    async fn find_by_id(&self, id: &UserId) -> Result<Option<User>, UserRepoError>;
    async fn find_by_email(&self, email: &str) -> Result<Option<User>, UserRepoError>;
    async fn create(&self, user: &NewUser) -> Result<User, UserRepoError>;
    async fn update(&self, id: &UserId, update: &UserUpdate) -> Result<User, UserRepoError>;
    async fn list(&self, pagination: Pagination) -> Result<Page<User>, UserRepoError>;
}

pub struct PgUserRepository {
    pool: PgPool,
}

#[async_trait]
impl UserRepository for PgUserRepository {
    async fn find_by_id(&self, id: &UserId) -> Result<Option<User>, UserRepoError> {
        sqlx::query_as!(
            UserRow,
            r#"SELECT user_id, email, display_name, status as "status: _", 
                      skills, roles, quality_profile, created_at, updated_at
               FROM users WHERE user_id = $1"#,
            id.to_string()
        )
        .fetch_optional(&self.pool)
        .await
        .map_err(UserRepoError::Database)?
        .map(User::try_from)
        .transpose()
    }
    // ...
}
```

### Pattern 3: Hierarchical Domain Errors
**What:** Error enums per module/operation, composed at boundaries
**When to use:** All domain operations
**Example:**
```rust
// Source: expurple.me error design blog
use thiserror::Error;

// Per-operation errors in domain
#[derive(Debug, Error)]
pub enum CreateUserError {
    #[error("email already exists: {0}")]
    EmailExists(String),
    #[error("invalid email format")]
    InvalidEmail,
    #[error("database error")]
    Database(#[source] sqlx::Error),
}

#[derive(Debug, Error)]
pub enum FindUserError {
    #[error("user not found: {0}")]
    NotFound(UserId),
    #[error("database error")]
    Database(#[source] sqlx::Error),
}

// At API layer - compose into RFC 7807
use problem_details::ProblemDetails;
use axum::response::IntoResponse;

impl IntoResponse for CreateUserError {
    fn into_response(self) -> axum::response::Response {
        let (status, error_type, detail) = match &self {
            CreateUserError::EmailExists(email) => (
                http::StatusCode::CONFLICT,
                "user.email.exists",
                format!("A user with email {} already exists", email),
            ),
            CreateUserError::InvalidEmail => (
                http::StatusCode::BAD_REQUEST,
                "user.email.invalid",
                "The provided email format is invalid".to_string(),
            ),
            CreateUserError::Database(_) => (
                http::StatusCode::INTERNAL_SERVER_ERROR,
                "internal",
                "An internal error occurred".to_string(),
            ),
        };
        
        ProblemDetails::new()
            .with_status(status)
            .with_type(format!("https://api.glyph.app/errors/{}", error_type).parse().unwrap())
            .with_title(self.to_string())
            .with_detail(detail)
            .into_response()
    }
}
```

### Pattern 4: Audit Event Recording
**What:** Capture field-level changes in JSONB for event sourcing
**When to use:** All mutating operations
**Example:**
```rust
// Source: PostgreSQL audit patterns
use serde_json::Value;

#[derive(Debug, Clone, Serialize)]
pub struct AuditEvent {
    pub entity_type: &'static str,
    pub entity_id: String,
    pub action: AuditAction,
    pub actor_id: String,
    pub actor_type: ActorType,
    pub data_snapshot: Value,
    pub changes: Option<Value>,
    pub request_id: Option<String>,
}

#[derive(Debug, Clone, Copy, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum AuditAction {
    Create,
    Read,
    Update,
    Delete,
}

pub struct AuditWriter {
    pool: PgPool,
}

impl AuditWriter {
    pub async fn record(&self, event: AuditEvent) -> Result<(), sqlx::Error> {
        sqlx::query!(
            r#"INSERT INTO audit_events 
               (entity_type, entity_id, action, actor_id, actor_type, 
                data_snapshot, changes, request_id, occurred_at)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())"#,
            event.entity_type,
            event.entity_id,
            serde_json::to_string(&event.action).unwrap(),
            event.actor_id,
            serde_json::to_string(&event.actor_type).unwrap(),
            event.data_snapshot,
            event.changes,
            event.request_id,
        )
        .execute(&self.pool)
        .await?;
        Ok(())
    }
    
    /// Compute field-level diff between old and new values
    pub fn compute_changes(old: &Value, new: &Value) -> Option<Value> {
        let mut changes = serde_json::Map::new();
        if let (Value::Object(old_obj), Value::Object(new_obj)) = (old, new) {
            for (key, new_val) in new_obj {
                if old_obj.get(key) != Some(new_val) {
                    changes.insert(key.clone(), serde_json::json!({
                        "old": old_obj.get(key),
                        "new": new_val
                    }));
                }
            }
        }
        if changes.is_empty() { None } else { Some(Value::Object(changes)) }
    }
}
```

### Pattern 5: OpenAPI with utoipa-axum
**What:** Combined route registration and OpenAPI generation
**When to use:** All API routes
**Example:**
```rust
// Source: utoipa-axum README
use utoipa::OpenApi;
use utoipa_axum::{router::OpenApiRouter, routes};

#[derive(OpenApi)]
#[openapi(
    info(title = "Glyph API", version = "1.0.0"),
    tags(
        (name = "users", description = "User management"),
        (name = "projects", description = "Project management"),
    )
)]
struct ApiDoc;

pub fn api_v1_router() -> OpenApiRouter {
    OpenApiRouter::new()
        .nest("/users", users::router())
        .nest("/projects", projects::router())
        .nest("/tasks", tasks::router())
}

// In users.rs
pub fn router() -> OpenApiRouter {
    OpenApiRouter::new()
        .routes(routes!(list_users, create_user))
        .routes(routes!(get_user, update_user, delete_user))
}

#[utoipa::path(
    get,
    path = "/",
    tag = "users",
    responses(
        (status = 200, description = "List users", body = [User]),
        (status = 500, body = ProblemDetails)
    ),
    params(
        ("limit" = Option<i32>, Query, description = "Max results"),
        ("offset" = Option<i32>, Query, description = "Offset")
    )
)]
async fn list_users(
    State(repo): State<Arc<dyn UserRepository>>,
    Query(pagination): Query<Pagination>,
) -> Result<Json<Vec<User>>, ApiError> {
    // ...
}
```

### Anti-Patterns to Avoid
- **Global error enum:** Don't create a single `Error` type with all variants - use per-operation errors
- **Bare UUID in API:** Never expose raw UUIDs - always use prefixed string format
- **Status as column:** The decisions specify status enum includes `deleted` - don't add separate `deleted_at` column
- **Generic query builder:** Use explicit repository methods, not generic `query(&filter)` patterns
- **Skip audit on reads:** The context explicitly requires logging all API calls including reads

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| RFC 7807 errors | Custom JSON error format | `problem_details` crate | Handles content-type, serialization, extensions |
| OpenAPI spec | Manual JSON/YAML | `utoipa` + `utoipa-axum` | Compile-time validated, auto-synced with handlers |
| TypeScript types | Manual .d.ts files | `typeshare` CLI | Single source of truth in Rust |
| UUID v7 generation | Custom timestamp encoding | `uuid::Uuid::now_v7()` | Handles counter for same-millisecond ordering |
| Connection pooling | Manual pool management | SQLx built-in pool | Already configured in `libs/db` |
| Field change tracking | Manual diff logic | `serde_json` diff helpers | JSONB comparison is well-supported |

**Key insight:** The standard tools handle edge cases (UUID counter overflow, pool connection limits, content-type negotiation) that custom solutions typically miss.

## Common Pitfalls

### Pitfall 1: Storing UUID as Binary vs Text
**What goes wrong:** Storing prefixed IDs as UUID type loses the prefix
**Why it happens:** PostgreSQL UUID type only holds the 128-bit value
**How to avoid:** Store as TEXT (VARCHAR), parse prefix on read
**Warning signs:** Prefix information lost after database round-trip

### Pitfall 2: Missing Transaction Boundaries
**What goes wrong:** Partial writes when multi-entity operation fails mid-way
**Why it happens:** Each repository method uses its own transaction
**How to avoid:** Pass explicit `&mut Transaction` for multi-entity operations
**Warning signs:** Orphaned audit events, partially updated entities

### Pitfall 3: Audit Trail Inconsistency
**What goes wrong:** Audit records don't match actual state
**Why it happens:** Recording audit after commit, separate transaction
**How to avoid:** Include audit write in same transaction as entity change
**Warning signs:** Gaps in audit log, missing events after crashes

### Pitfall 4: SQLx Enum Mismatch
**What goes wrong:** Runtime error on status enum values
**Why it happens:** Rust enum variants don't match PostgreSQL enum values exactly
**How to avoid:** Use `#[sqlx(rename_all = "snake_case")]` and match SQL `CREATE TYPE`
**Warning signs:** "unexpected variant" errors in query results

### Pitfall 5: TypeScript Optional vs Null
**What goes wrong:** Frontend expects `null` but gets `undefined` or vice versa
**Why it happens:** `Option<T>` can serialize as either depending on config
**How to avoid:** Use `#[serde(skip_serializing_if = "Option::is_none")]` for optional fields
**Warning signs:** TypeScript strict null checks failing

### Pitfall 6: Partition Key in Foreign Keys
**What goes wrong:** Foreign key references fail on partitioned tables
**Why it happens:** Tasks table is partitioned by `project_id` - PK is `(project_id, task_id)`
**How to avoid:** Always include `project_id` in FKs referencing tasks/annotations
**Warning signs:** Migration errors mentioning "missing columns in referenced table"

## Code Examples

Verified patterns from official sources:

### UUID v7 Generation
```rust
// Source: https://docs.rs/uuid/latest/uuid/struct.Uuid.html
use uuid::Uuid;

// Basic v7 UUID
let id = Uuid::now_v7();

// With explicit timestamp (for testing)
use uuid::{Timestamp, NoContext};
let ts = Timestamp::from_unix(NoContext, 1706400000, 0);
let id = Uuid::new_v7(ts);

// With counter for batch ordering
use uuid::ContextV7;
let ctx = ContextV7::new();
let id1 = Uuid::new_v7(Timestamp::from_unix(&ctx, 1706400000, 0));
let id2 = Uuid::new_v7(Timestamp::from_unix(&ctx, 1706400000, 0));
assert!(id1 < id2); // Guaranteed ordering
```

### SQLx Enum Type
```rust
// Source: https://docs.rs/sqlx/latest/sqlx/trait.Type.html
#[derive(Debug, Clone, Copy, PartialEq, Eq, sqlx::Type, Serialize, Deserialize)]
#[sqlx(type_name = "user_status", rename_all = "snake_case")]
#[serde(rename_all = "snake_case")]
pub enum UserStatus {
    Active,
    Inactive,
    Suspended,
    Deleted, // Added for soft delete per decisions
}
```

### utoipa Schema for Domain Types
```rust
// Source: https://docs.rs/utoipa/latest/utoipa/
use utoipa::ToSchema;

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct User {
    /// Prefixed user ID (e.g., user_01234567-89ab-cdef-0123-456789abcdef)
    #[schema(example = "user_01961a8e-7d3a-7f1c-9b2e-4a5c6d7e8f90")]
    pub user_id: UserId,
    
    #[schema(example = "alice@example.com")]
    pub email: String,
    
    pub status: UserStatus,
    
    pub created_at: DateTime<Utc>,
}
```

### Problem Details Error Response
```rust
// Source: https://docs.rs/problem_details/latest/problem_details/
use problem_details::ProblemDetails;

#[derive(Serialize)]
struct ValidationErrors {
    errors: Vec<FieldError>,
}

#[derive(Serialize)]
struct FieldError {
    field: String,
    message: String,
}

fn validation_error(errors: Vec<FieldError>) -> impl IntoResponse {
    ProblemDetails::new()
        .with_status(http::StatusCode::BAD_REQUEST)
        .with_type("https://api.glyph.app/errors/validation".parse().unwrap())
        .with_title("Validation Failed")
        .with_detail("One or more fields failed validation")
        .with_extensions(ValidationErrors { errors })
}
```

### typeshare Configuration
```toml
# typeshare.toml
[typescript]
# Output file for generated types
output_file = "packages/web/src/types/generated.ts"

# Map Rust types to TypeScript
[typescript.type_mappings]
"DateTime" = "string"
"Uuid" = "string"
"UserId" = "string"
"ProjectId" = "string"
"TaskId" = "string"
"AnnotationId" = "string"
"Value" = "unknown"
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| RFC 7807 | RFC 9457 | 2024 | Minor clarifications, same structure |
| `uuid` v4 only | `uuid` v7 native | uuid 1.4+ | Time-sortable IDs built-in |
| `utoipa` + manual routes | `utoipa-axum` | 2024 | Single registration for routes + docs |
| `typeshare` 0.x | `typeshare` 1.0 | 2024 | Stable API, better config |
| Custom audit triggers | Application-level audit | - | Better control, portable across DBs |

**Deprecated/outdated:**
- `uuid7` crate: Use `uuid` crate with `v7` feature instead
- `utoipa` without `utoipa-axum`: Requires duplicate route registration
- Database triggers for audit: Less portable, harder to test

## Open Questions

Things that couldn't be fully resolved:

1. **typeshare Option→null handling**
   - What we know: typeshare converts `Option<T>` to optional properties (`field?: T`)
   - What's unclear: Whether `T | null` output is configurable (context says "use Tsify")
   - Recommendation: Test typeshare output; if `T | null` needed, consider `tsify` for WASM types or post-process

2. **Audit event partitioning timeline**
   - What we know: Migration creates 2025-2026 monthly partitions
   - What's unclear: Auto-partition creation for future months
   - Recommendation: Add partition management script or use pg_partman extension

3. **Full subgraph resurrection implementation**
   - What we know: Requirement to restore entire dependency trees from events
   - What's unclear: Exact algorithm for traversing event log
   - Recommendation: Defer detailed design to implementation; ensure events capture all FK relationships

## Sources

### Primary (HIGH confidence)
- [uuid crate docs](https://docs.rs/uuid/latest/uuid/) - UUID v7 generation patterns
- [SQLx Type trait](https://docs.rs/sqlx/latest/sqlx/trait.Type.html) - Custom type implementation
- [utoipa docs](https://docs.rs/utoipa/latest/utoipa/) - OpenAPI generation
- [utoipa-axum README](https://github.com/juhaku/utoipa/blob/master/utoipa-axum/README.md) - Router integration
- [problem_details crate](https://docs.rs/problem_details/latest/problem_details/) - RFC 9457 implementation

### Secondary (MEDIUM confidence)
- [expurple.me error design](https://home.expurple.me/posts/designing-error-types-in-rust-applications/) - Error enum patterns
- [sabrinajewson.org errors](https://sabrinajewson.org/blog/errors) - Error API design
- [kerkour.com error organization](https://kerkour.com/rust-organize-errors-large-projects) - Large project patterns
- [typeshare GitHub](https://github.com/1Password/typeshare) - TypeScript generation

### Tertiary (LOW confidence)
- Tsify for `T | null` output - needs verification with actual usage
- Event sourcing resurrection algorithm - pattern exists but implementation details TBD

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - all libraries verified in official docs
- Architecture: HIGH - patterns from official examples and established blogs
- Pitfalls: HIGH - based on existing codebase analysis and official docs
- Event sourcing details: MEDIUM - general patterns known, specific implementation TBD

**Research date:** 2026-01-28
**Valid until:** 2026-02-28 (stable ecosystem, no major breaking changes expected)
