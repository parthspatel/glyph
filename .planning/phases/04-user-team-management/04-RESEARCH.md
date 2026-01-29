# Phase 4: User & Team Management - Research

**Researched:** 2026-01-28
**Domain:** User/Team CRUD, RBAC Permissions, Skill Certification, Admin UI
**Confidence:** MEDIUM-HIGH

## Summary

Phase 4 implements comprehensive user and team management with a hybrid RBAC permission system. The Rust ecosystem offers several RBAC libraries (Casbin, axum-login) but the project's simplified two-role global model (Admin/User) with scoped team permissions can be implemented directly without heavy frameworks. The hierarchical team structure requires PostgreSQL recursive CTEs for permission cascade queries. Skill certification tracking follows industry-standard 5-level proficiency systems with expiration and soft/hard blocking.

The React frontend should use TanStack Table v8 for data grids with bulk operations, React Hook Form for form validation, and Material UI or Tailwind components for admin interfaces. The existing `CurrentUser` extractor from Phase 3 provides the foundation for permission checks.

**Primary recommendation:** Implement custom lightweight RBAC using Axum extractors rather than heavy frameworks, use PostgreSQL recursive CTEs for hierarchical team queries, adopt React Hook Form + TanStack Table for admin UI, and implement audit logging via database triggers for all profile/permission changes.

## Standard Stack

The established libraries for this domain:

### Core - Backend

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `axum-login` | 0.16.x | Permission macros, auth middleware | `permission_required!` macro, integrates with Axum extractors |
| `sqlx` | 0.8.x | PostgreSQL queries, transactions | Already in project, excellent async support, compile-time query checking |
| `serde_json` | 1.x | JSONB skill/role serialization | Standard JSON library, already in use for domain types |

### Core - Frontend

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `react-hook-form` | 7.x | Form validation | Zero dependencies, minimal re-renders, excellent TypeScript support |
| `@tanstack/react-table` | 8.x | Data grids with sorting/filtering | Headless, tree-shakeable, built-in selection/pagination |
| `@tanstack/react-query` | 5.x | Server state management | Optimistic updates, cache invalidation, mutation handling |

### Supporting - Backend

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `axum-sqlx-tx` | 0.8.x | Automatic transaction rollback | Automatic commit/rollback based on HTTP status |
| `thiserror` | 1.x | Error type definitions | Already in project for `ApiError` enum |
| `tower` | 0.5.x | Middleware composition | Custom permission middleware if needed |

### Supporting - Frontend

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@mui/material` or `shadcn/ui` | 5.x / Latest | Component library | Admin UI components (tables, forms, badges) |
| `zod` | 3.x | Schema validation | Type-safe form validation with React Hook Form |
| `react-avatar` | 5.x | Avatar component | Initials fallback, image loading |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Custom RBAC | Casbin | Casbin adds complexity, project needs are simple (2 global roles) |
| Recursive CTEs | Materialized path | CTEs are standard SQL, materialized path requires denormalization |
| React Hook Form | Formik | Formik has 7 dependencies vs RHF's zero, larger bundle |
| TanStack Table | ag-Grid | ag-Grid is commercial for enterprise features, TanStack is MIT |

**Installation - Backend:**
```bash
# Add to libs/auth/Cargo.toml (if using axum-login)
axum-login = "0.16"

# Add to apps/api/Cargo.toml (if using transaction helper)
axum-sqlx-tx = "0.8"
```

**Installation - Frontend:**
```bash
cd packages/web
npm install react-hook-form @tanstack/react-table @tanstack/react-query zod
npm install @hookform/resolvers  # For zod integration
```

## Architecture Patterns

### Recommended Project Structure - Backend

```
apps/api/src/
├── routes/
│   ├── users.rs           # User CRUD endpoints
│   ├── teams.rs           # Team CRUD endpoints
│   ├── skills.rs          # Skill certification endpoints
│   └── admin.rs           # Bulk operations endpoints
├── extractors/
│   ├── current_user.rs    # Existing from Phase 3
│   ├── permissions.rs     # Permission checking extractors
│   └── require_admin.rs   # Admin-only extractor
├── services/
│   ├── user_service.rs    # User business logic
│   ├── team_service.rs    # Team hierarchy logic
│   └── permission_service.rs  # Permission evaluation
└── repositories/
    ├── user_repo.rs       # User database queries
    ├── team_repo.rs       # Team + hierarchy queries
    └── skill_repo.rs      # Skill certification queries
```

### Recommended Project Structure - Frontend

```
packages/web/src/
├── features/
│   ├── users/
│   │   ├── components/
│   │   │   ├── UserProfileCard.tsx
│   │   │   ├── UserSkillChips.tsx
│   │   │   ├── UserQualityMetrics.tsx
│   │   │   └── UserEditForm.tsx
│   │   ├── hooks/
│   │   │   ├── useUser.ts
│   │   │   └── useUserMutations.ts
│   │   └── pages/
│   │       ├── UserProfilePage.tsx
│   │       └── UserListPage.tsx
│   ├── teams/
│   │   ├── components/
│   │   │   ├── TeamHierarchy.tsx
│   │   │   ├── TeamMemberList.tsx
│   │   │   └── TeamEditForm.tsx
│   │   └── pages/
│   │       ├── TeamPage.tsx
│   │       └── TeamManagementPage.tsx
│   └── admin/
│       ├── components/
│       │   ├── BulkOperationsToolbar.tsx
│       │   ├── UserDataTable.tsx
│       │   └── TeamDataTable.tsx
│       └── pages/
│           └── AdminDashboard.tsx
└── components/
    └── ui/
        ├── Avatar.tsx
        ├── Badge.tsx
        └── DataTable.tsx
```

### Pattern 1: Permission Extractor with Cascade

**What:** Custom Axum extractor that checks both global roles and team-scoped permissions with automatic cascade to sub-teams.

**When to use:** Every protected endpoint that requires team-specific permissions.

**Example:**
```rust
// Source: Custom pattern based on axum-login concepts
// apps/api/src/extractors/permissions.rs

use axum::{async_trait, extract::FromRequestParts, http::request::Parts};
use crate::{ApiError, CurrentUser};

pub struct RequireTeamLead {
    pub user: CurrentUser,
    pub team_id: String,
}

#[async_trait]
impl<S> FromRequestParts<S> for RequireTeamLead
where
    S: Send + Sync,
{
    type Rejection = ApiError;

    async fn from_request_parts(parts: &mut Parts, state: &S) -> Result<Self, Self::Rejection> {
        let user = CurrentUser::from_request_parts(parts, state).await?;
        
        // Extract team_id from path
        let team_id = parts.uri.path()
            .split('/')
            .find(|s| s.starts_with("team_"))
            .ok_or(ApiError::BadRequest {
                code: "missing_team_id",
                message: "Team ID not found in path".into(),
            })?;

        // Check if user is admin (global permission)
        if user.roles.contains(&"admin".to_string()) {
            return Ok(RequireTeamLead { user, team_id: team_id.into() });
        }

        // Check team leadership with cascade
        // This queries database to check if user leads team OR any parent team
        let has_permission = check_team_leadership_cascade(&user.user_id, team_id, &state.db).await?;
        
        if !has_permission {
            return Err(ApiError::Forbidden {
                code: "missing_permission",
                message: format!("Requires permission: team:lead({})", team_id),
            });
        }

        Ok(RequireTeamLead { user, team_id: team_id.into() })
    }
}

// Usage in handler
async fn add_team_member(
    RequireTeamLead { user, team_id }: RequireTeamLead,
    Json(req): Json<AddMemberRequest>,
) -> Result<Json<TeamResponse>, ApiError> {
    // User is guaranteed to be team leader at this point
    // ...
}
```

### Pattern 2: Hierarchical Team Query with Recursive CTE

**What:** PostgreSQL recursive CTE to query team hierarchy for permission cascade and member listing.

**When to use:** Checking if user leads any parent team, getting all sub-teams, calculating aggregate team metrics.

**Example:**
```sql
-- Source: PostgreSQL official documentation + project requirements
-- Get all teams user can manage (teams they lead + all sub-teams)

WITH RECURSIVE team_tree AS (
    -- Base case: teams where user is leader
    SELECT t.team_id, t.parent_team_id, t.name, 0 as depth
    FROM teams t
    JOIN team_memberships tm ON t.team_id = tm.team_id
    WHERE tm.user_id = $1 
      AND tm.role = 'Leader'
      AND t.status = 'active'
    
    UNION ALL
    
    -- Recursive case: all child teams
    SELECT t.team_id, t.parent_team_id, t.name, tt.depth + 1
    FROM teams t
    JOIN team_tree tt ON t.parent_team_id = tt.team_id
    WHERE t.status = 'active'
)
SELECT team_id, name, depth
FROM team_tree
ORDER BY depth, name;
```

**SQLx implementation:**
```rust
// Source: Custom pattern using sqlx
// libs/db/src/repositories/team_repo.rs

pub async fn get_managed_teams(
    pool: &PgPool,
    user_id: &UserId,
) -> Result<Vec<Team>, sqlx::Error> {
    sqlx::query_as!(
        Team,
        r#"
        WITH RECURSIVE team_tree AS (
            SELECT t.team_id, t.parent_team_id, t.name, t.description, 
                   t.status, t.created_at, t.updated_at, 0 as depth
            FROM teams t
            JOIN team_memberships tm ON t.team_id = tm.team_id
            WHERE tm.user_id = $1 
              AND tm.role = 'Leader'
              AND t.status != 'deleted'
            
            UNION ALL
            
            SELECT t.team_id, t.parent_team_id, t.name, t.description,
                   t.status, t.created_at, t.updated_at, tt.depth + 1
            FROM teams t
            JOIN team_tree tt ON t.parent_team_id = tt.team_id
            WHERE t.status != 'deleted'
        )
        SELECT team_id, parent_team_id, name, description, 
               status as "status: TeamStatus", created_at, updated_at
        FROM team_tree
        ORDER BY depth, name
        "#,
        user_id.as_uuid()
    )
    .fetch_all(pool)
    .await
}
```

### Pattern 3: Skill Expiration with Grace Period

**What:** Skill certification tracking with soft expiration (warning) and hard expiration (blocking) using database queries.

**When to use:** Displaying skill status, enforcing certification requirements for task assignment (Phase 5+).

**Example:**
```rust
// Source: Industry certification tracking patterns
// libs/domain/src/user.rs

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UserSkill {
    pub skill_id: String,
    pub proficiency: Option<ProficiencyLevel>,
    pub certified_by: Option<UserId>,
    pub certified_at: Option<DateTime<Utc>>,
    pub expires_at: Option<DateTime<Utc>>,
    pub grace_period_days: Option<i32>,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
pub enum SkillStatus {
    Active,          // Not expired
    SoftExpired,     // Past expiration but within grace period
    HardExpired,     // Past grace period
    NeverExpires,    // No expiration set
}

impl UserSkill {
    pub fn status(&self) -> SkillStatus {
        let Some(expires_at) = self.expires_at else {
            return SkillStatus::NeverExpires;
        };

        let now = Utc::now();
        if now < expires_at {
            return SkillStatus::Active;
        }

        let grace_days = self.grace_period_days.unwrap_or(0);
        let grace_end = expires_at + Duration::days(grace_days as i64);
        
        if now < grace_end {
            SkillStatus::SoftExpired
        } else {
            SkillStatus::HardExpired
        }
    }
}
```

### Pattern 4: React Hook Form + Zod for User Edit Form

**What:** Type-safe form validation using Zod schema with React Hook Form for user profile editing.

**When to use:** All forms with validation requirements (user edit, team create, skill certification).

**Example:**
```typescript
// Source: React Hook Form + Zod integration docs
// packages/web/src/features/users/components/UserEditForm.tsx

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const userProfileSchema = z.object({
  display_name: z.string().min(1, 'Name is required').max(255),
  bio: z.string().max(1000).optional(),
  timezone: z.string().optional(),
  department: z.string().optional(),
});

type UserProfileForm = z.infer<typeof userProfileSchema>;

export function UserEditForm({ user, onSave }: Props) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<UserProfileForm>({
    resolver: zodResolver(userProfileSchema),
    defaultValues: {
      display_name: user.display_name,
      bio: user.bio,
      timezone: user.timezone,
      department: user.department,
    },
  });

  const mutation = useMutation({
    mutationFn: (data: UserProfileForm) => api.updateUser(user.user_id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['user', user.user_id]);
      onSave();
    },
  });

  return (
    <form onSubmit={handleSubmit((data) => mutation.mutate(data))}>
      <input {...register('display_name')} />
      {errors.display_name && <span>{errors.display_name.message}</span>}
      
      <textarea {...register('bio')} />
      {errors.bio && <span>{errors.bio.message}</span>}
      
      <button type="submit" disabled={isSubmitting}>
        Save
      </button>
    </form>
  );
}
```

### Pattern 5: TanStack Table with Bulk Operations

**What:** Data table with multi-select checkboxes and bulk action toolbar for admin operations.

**When to use:** Admin user list, team management, any list requiring bulk operations.

**Example:**
```typescript
// Source: TanStack Table v8 + shadcn/ui patterns
// packages/web/src/features/admin/components/UserDataTable.tsx

import { useReactTable, getCoreRowModel, ColumnDef } from '@tanstack/react-table';
import { useState } from 'react';

export function UserDataTable({ users }: Props) {
  const [rowSelection, setRowSelection] = useState({});

  const columns: ColumnDef<User>[] = [
    {
      id: 'select',
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllRowsSelected()}
          indeterminate={table.getIsSomeRowsSelected()}
          onChange={table.getToggleAllRowsSelectedHandler()}
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onChange={row.getToggleSelectedHandler()}
        />
      ),
    },
    {
      accessorKey: 'display_name',
      header: 'Name',
    },
    {
      accessorKey: 'email',
      header: 'Email',
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ getValue }) => <StatusBadge status={getValue()} />,
    },
  ];

  const table = useReactTable({
    data: users,
    columns,
    state: { rowSelection },
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
  });

  const selectedUsers = table.getSelectedRowModel().rows.map(r => r.original);

  return (
    <>
      {selectedUsers.length > 0 && (
        <BulkActionsToolbar
          count={selectedUsers.length}
          onDeactivate={() => bulkDeactivate(selectedUsers)}
          onAssignRole={() => bulkAssignRole(selectedUsers)}
        />
      )}
      <Table>
        {/* Table rendering */}
      </Table>
    </>
  );
}
```

### Pattern 6: Audit Log via Database Trigger

**What:** Automatic audit trail for all user/team/permission changes using PostgreSQL triggers.

**When to use:** Required for user profile changes, permission grants/revokes, team membership changes.

**Example:**
```sql
-- Source: PostgreSQL audit trigger patterns
-- migrations/00XX_create_audit_log.sql

CREATE TABLE audit_log (
    audit_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_name      VARCHAR(63) NOT NULL,
    record_id       UUID NOT NULL,
    operation       VARCHAR(10) NOT NULL,  -- INSERT, UPDATE, DELETE
    old_values      JSONB,
    new_values      JSONB,
    changed_by      UUID,  -- user_id who made the change
    changed_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_log_record ON audit_log (table_name, record_id);
CREATE INDEX idx_audit_log_user ON audit_log (changed_by);
CREATE INDEX idx_audit_log_time ON audit_log (changed_at DESC);

-- Generic audit trigger function
CREATE OR REPLACE FUNCTION audit_trigger_func()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        INSERT INTO audit_log (table_name, record_id, operation, old_values, changed_by)
        VALUES (TG_TABLE_NAME, OLD.user_id, 'DELETE', to_jsonb(OLD), current_setting('app.current_user_id', true)::uuid);
        RETURN OLD;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO audit_log (table_name, record_id, operation, old_values, new_values, changed_by)
        VALUES (TG_TABLE_NAME, NEW.user_id, 'UPDATE', to_jsonb(OLD), to_jsonb(NEW), current_setting('app.current_user_id', true)::uuid);
        RETURN NEW;
    ELSIF TG_OP = 'INSERT' THEN
        INSERT INTO audit_log (table_name, record_id, operation, new_values, changed_by)
        VALUES (TG_TABLE_NAME, NEW.user_id, 'INSERT', to_jsonb(NEW), current_setting('app.current_user_id', true)::uuid);
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Attach to users table
CREATE TRIGGER audit_users
AFTER INSERT OR UPDATE OR DELETE ON users
FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

-- Attach to team_memberships table
CREATE TRIGGER audit_team_memberships
AFTER INSERT OR UPDATE OR DELETE ON team_memberships
FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();
```

**Setting current user in application:**
```rust
// Source: PostgreSQL custom settings pattern
// Before each request that modifies data

sqlx::query!("SELECT set_config('app.current_user_id', $1, true)", user_id.to_string())
    .execute(&mut tx)
    .await?;

// Now all audit triggers will capture this user_id
```

### Anti-Patterns to Avoid

- **Hard-coded permission strings:** Use constants or enums for permission names to prevent typos
- **Nested team queries without depth limit:** Always add depth limit to recursive CTEs to prevent infinite loops
- **Storing computed values:** Don't store skill status (active/expired) - compute from expiration dates
- **Client-side permission checks only:** Always enforce permissions on backend, client checks are for UI only
- **Cascading deletes on users:** Use soft delete (status='deleted') to preserve audit trail and foreign key integrity

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| JWT validation | Custom JWT parser | `jsonwebtoken` crate | Already implemented in Phase 3, handles RS256, JWKS |
| Form validation | Custom validators | `zod` + `react-hook-form` | Type-safe schema, minimal re-renders, excellent DX |
| Data table sorting/filtering | Custom table logic | `@tanstack/react-table` | Tree-shakeable, handles pagination/selection/sorting |
| Avatar generation | Canvas/SVG generator | `react-avatar` or CSS-only initials | Handles image loading, fallback, caching |
| Permission cascade | Manual parent traversal | Recursive CTE | Database-optimized, single query vs N queries |
| Audit logging | Application-level logging | Database triggers | Captures ALL changes including migrations, admin tools |
| Transaction rollback | Manual try/catch | `axum-sqlx-tx` | Automatic based on HTTP status, prevents forgotten rollbacks |
| Skill proficiency enums | Hardcoded values | Configurable per skill type | Requirements specify user-defined hierarchy |

**Key insight:** The hybrid RBAC model (2 global roles + scoped team permissions) is simple enough that heavyweight frameworks like Casbin add more complexity than value. Custom Axum extractors with database-backed permission checks provide better type safety and integration with the existing error handling system.

## Common Pitfalls

### Pitfall 1: Permission Check Without Cascade

**What goes wrong:** Checking only direct team membership/leadership without traversing parent teams.

**Why it happens:** Forgetting that team leadership cascades to all sub-teams per requirements.

**How to avoid:** Always use recursive CTE queries for team permission checks. Create a `check_team_permission_cascade()` helper function that all extractors use.

**Warning signs:** 
- Team leaders can't manage sub-teams
- Permission denied errors when they shouldn't occur
- Multiple queries to check parent hierarchy

**Prevention:**
```rust
// WRONG: Direct team membership check only
SELECT EXISTS(
    SELECT 1 FROM team_memberships
    WHERE user_id = $1 AND team_id = $2 AND role = 'Leader'
)

// RIGHT: Check team OR any parent team
WITH RECURSIVE parent_teams AS (
    SELECT team_id, parent_team_id FROM teams WHERE team_id = $2
    UNION ALL
    SELECT t.team_id, t.parent_team_id
    FROM teams t
    JOIN parent_teams pt ON t.team_id = pt.parent_team_id
)
SELECT EXISTS(
    SELECT 1 FROM team_memberships tm
    JOIN parent_teams pt ON tm.team_id = pt.team_id
    WHERE tm.user_id = $1 AND tm.role = 'Leader'
)
```

### Pitfall 2: Forgetting Soft Delete in Queries

**What goes wrong:** Queries return deleted users/teams, causing unexpected results in UI and permission checks.

**Why it happens:** UserStatus has 'Deleted' variant but queries don't filter it out.

**How to avoid:** Add `WHERE status != 'deleted'` to all SELECT queries. Consider database view that excludes deleted records.

**Warning signs:**
- Deleted users appear in team member lists
- Deleted teams show in hierarchy
- Reactivating users causes unique constraint violations

**Prevention:**
```rust
// Add to all user queries
WHERE u.status != 'deleted'

// Or create a view
CREATE VIEW active_users AS
SELECT * FROM users WHERE status != 'deleted';

// Then query the view
SELECT * FROM active_users WHERE ...
```

### Pitfall 3: Race Conditions in Skill Expiration

**What goes wrong:** Skill shows as active in one query, expired in another due to time-based status calculation.

**Why it happens:** Computing status from `expires_at` timestamp in application code vs database creates inconsistency.

**How to avoid:** Always compute skill status in database queries for consistency. Use database NOW() not application Utc::now().

**Warning signs:**
- Skill status flickers between active/expired
- Users get assigned tasks they shouldn't
- Inconsistent UI displays

**Prevention:**
```sql
-- Compute status in query
SELECT 
    skill_id,
    proficiency,
    CASE
        WHEN expires_at IS NULL THEN 'never_expires'
        WHEN NOW() < expires_at THEN 'active'
        WHEN NOW() < expires_at + INTERVAL '1 day' * grace_period_days THEN 'soft_expired'
        ELSE 'hard_expired'
    END as status
FROM user_skills
```

### Pitfall 4: UUID v7 B-tree Index Fragmentation

**What goes wrong:** UUID v7 insert performance degrades due to sequential writes causing worst-case B-tree behavior.

**Why it happens:** UUID v7's time-ordering can actually hurt B-tree indexes in certain scenarios.

**How to avoid:** Monitor index bloat. Consider hash index for lookup-only columns. Ensure proper `FILLFACTOR` for tables with high insert volume.

**Warning signs:**
- Increasing WAL generation
- Slow user/team creation over time
- Index size growing faster than data

**Prevention:**
```sql
-- Set fillfactor lower for high-insert tables
CREATE TABLE users (
    ...
) WITH (fillfactor = 90);

-- Use hash index for lookup-only columns (email)
CREATE INDEX idx_users_email_hash ON users USING HASH (email);

-- Monitor index bloat
SELECT 
    schemaname, tablename, 
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size,
    pg_size_pretty(pg_indexes_size(schemaname||'.'||tablename)) AS index_size
FROM pg_tables
WHERE tablename IN ('users', 'teams', 'team_memberships');
```

### Pitfall 5: Bulk Operations Without Transactions

**What goes wrong:** Partial completion of bulk operations (e.g., 50 users deactivated, 50 failed).

**Why it happens:** Applying operations one-by-one without transaction wrapper.

**How to avoid:** Always wrap bulk operations in database transactions. Use `axum-sqlx-tx` or manual transaction management.

**Warning signs:**
- Inconsistent data after bulk operations
- Users report "some worked, some didn't"
- Difficult to retry failed bulk operations

**Prevention:**
```rust
// WRONG: No transaction
for user_id in user_ids {
    deactivate_user(&pool, user_id).await?;  // Partial failure possible
}

// RIGHT: Single transaction
let mut tx = pool.begin().await?;
for user_id in user_ids {
    deactivate_user(&mut tx, user_id).await?;
}
tx.commit().await?;  // All or nothing

// BEST: Using axum-sqlx-tx (automatic)
async fn bulk_deactivate(
    Tx(mut tx): Tx<Postgres>,
    Json(req): Json<BulkDeactivateRequest>,
) -> Result<StatusCode, ApiError> {
    for user_id in req.user_ids {
        deactivate_user(&mut tx, &user_id).await?;
    }
    // Transaction auto-commits on 2xx response, rolls back on error
    Ok(StatusCode::OK)
}
```

### Pitfall 6: Avatar Loading Performance

**What goes wrong:** Loading 100+ user avatars on admin page causes slow page load and network congestion.

**Why it happens:** Each avatar fetched separately, no lazy loading or CDN caching.

**How to avoid:** Use lazy loading for images, implement avatar CDN caching, serve low-res avatars in lists.

**Warning signs:**
- Slow admin user list page
- High bandwidth usage
- Many parallel image requests

**Prevention:**
```typescript
// Use native lazy loading
<img src={avatarUrl} loading="lazy" alt={name} />

// Or use Intersection Observer for custom lazy loading
import { LazyImage } from '@/components/ui/LazyImage';

<LazyImage 
  src={avatarUrl} 
  fallback={<AvatarInitials name={name} />}
  width={40} 
  height={40} 
/>

// Backend: Serve different sizes
GET /users/{id}/avatar?size=small  // 40x40 for lists
GET /users/{id}/avatar?size=medium // 100x100 for cards
GET /users/{id}/avatar?size=large  // 400x400 for profile
```

### Pitfall 7: Permission Denial Without Context

**What goes wrong:** User gets "Forbidden" error with no indication of what permission they need.

**Why it happens:** Generic 403 response without specific permission requirement in error message.

**How to avoid:** Always include required permission in error message (requirement: verbose permission denial).

**Warning signs:**
- User confusion about why they can't access something
- Support tickets asking "why can't I do X?"
- Generic "Access Denied" messages

**Prevention:**
```rust
// WRONG: Generic forbidden
return Err(ApiError::Forbidden);

// RIGHT: Verbose denial
return Err(ApiError::Forbidden {
    code: "missing_permission",
    message: format!(
        "Requires permission: team:lead({}) or global role: admin", 
        team_id
    ),
});

// Even better: Suggest how to get permission
return Err(ApiError::Forbidden {
    code: "missing_team_lead_permission",
    message: format!(
        "You need to be a leader of team '{}' or a system admin to perform this action. \
         Contact a team leader to be added as a co-leader, or contact an admin for help.",
        team_name
    ),
});
```

## Code Examples

Verified patterns from official sources and project requirements:

### Database Schema for Hierarchical Teams

```sql
-- Source: Project requirements + PostgreSQL hierarchical patterns
-- migrations/00XX_create_teams.sql

-- Team status enum (matches existing pattern)
CREATE TYPE team_status AS ENUM ('active', 'inactive', 'deleted');

-- Teams table with self-referencing hierarchy
CREATE TABLE teams (
    team_id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_team_id  UUID REFERENCES teams(team_id) ON DELETE RESTRICT,  -- Prevent orphans
    name            VARCHAR(255) NOT NULL,
    description     TEXT,
    status          team_status NOT NULL DEFAULT 'active',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Prevent cycles: team can't be its own parent
    CONSTRAINT team_not_self_parent CHECK (team_id != parent_team_id)
);

-- Indexes for hierarchy queries
CREATE INDEX idx_teams_parent ON teams (parent_team_id) WHERE parent_team_id IS NOT NULL;
CREATE INDEX idx_teams_status ON teams (status);

-- Team membership with simplified roles
CREATE TYPE team_role AS ENUM ('Leader', 'Member');

CREATE TABLE team_memberships (
    membership_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id             UUID NOT NULL REFERENCES teams(team_id) ON DELETE CASCADE,
    user_id             UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    role                team_role NOT NULL DEFAULT 'Member',
    allocation_percentage INTEGER CHECK (allocation_percentage > 0 AND allocation_percentage <= 100),
    joined_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- User can only have one role per team
    UNIQUE (team_id, user_id)
);

CREATE INDEX idx_team_memberships_team ON team_memberships (team_id);
CREATE INDEX idx_team_memberships_user ON team_memberships (user_id);
CREATE INDEX idx_team_memberships_role ON team_memberships (team_id, role);
```

### User Skills with Certification Tracking

```sql
-- Source: Project requirements + certification tracking patterns
-- migrations/00XX_add_skills_certification.sql

-- Skill types configuration (admin-managed)
CREATE TABLE skill_types (
    skill_id            VARCHAR(50) PRIMARY KEY,  -- e.g., 'medical_translation'
    name                VARCHAR(255) NOT NULL,
    description         TEXT,
    expiration_months   INTEGER,  -- NULL = never expires
    grace_period_days   INTEGER DEFAULT 0,
    requires_proficiency BOOLEAN DEFAULT FALSE,
    proficiency_levels  JSONB,  -- Array of level names e.g., ["novice", "intermediate", "expert"]
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- User skill certifications (replaces JSONB in users table)
CREATE TABLE user_skills (
    certification_id    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    skill_id            VARCHAR(50) NOT NULL REFERENCES skill_types(skill_id),
    proficiency_level   VARCHAR(50),  -- Must match one of skill_types.proficiency_levels
    certified_by        UUID REFERENCES users(user_id),
    certified_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at          TIMESTAMPTZ,
    notes               TEXT,
    
    -- User can only have one active certification per skill
    UNIQUE (user_id, skill_id)
);

CREATE INDEX idx_user_skills_user ON user_skills (user_id);
CREATE INDEX idx_user_skills_skill ON user_skills (skill_id);
CREATE INDEX idx_user_skills_expiry ON user_skills (expires_at) WHERE expires_at IS NOT NULL;

-- View for skill status
CREATE VIEW user_skills_with_status AS
SELECT 
    us.*,
    st.name as skill_name,
    st.grace_period_days,
    CASE
        WHEN us.expires_at IS NULL THEN 'never_expires'
        WHEN NOW() < us.expires_at THEN 'active'
        WHEN NOW() < us.expires_at + (INTERVAL '1 day' * st.grace_period_days) THEN 'soft_expired'
        ELSE 'hard_expired'
    END as status
FROM user_skills us
JOIN skill_types st ON us.skill_id = st.skill_id;
```

### Permission Service with Cache

```rust
// Source: Custom pattern based on axum-login + requirements
// apps/api/src/services/permission_service.rs

use std::sync::Arc;
use sqlx::PgPool;
use crate::{CurrentUser, ApiError};

pub struct PermissionService {
    pool: Arc<PgPool>,
}

impl PermissionService {
    pub fn new(pool: Arc<PgPool>) -> Self {
        Self { pool }
    }

    /// Check if user is admin (global permission)
    pub fn is_admin(&self, user: &CurrentUser) -> bool {
        user.roles.contains(&"admin".to_string())
    }

    /// Check if user can manage team (lead team OR any parent team)
    pub async fn can_manage_team(
        &self,
        user: &CurrentUser,
        team_id: &str,
    ) -> Result<bool, ApiError> {
        // Admins can manage any team
        if self.is_admin(user) {
            return Ok(true);
        }

        // Check team leadership with cascade
        let result = sqlx::query!(
            r#"
            WITH RECURSIVE parent_teams AS (
                SELECT team_id, parent_team_id 
                FROM teams 
                WHERE team_id = $1 AND status != 'deleted'
                
                UNION ALL
                
                SELECT t.team_id, t.parent_team_id
                FROM teams t
                JOIN parent_teams pt ON t.team_id = pt.parent_team_id
                WHERE t.status != 'deleted'
            )
            SELECT EXISTS(
                SELECT 1 
                FROM team_memberships tm
                JOIN parent_teams pt ON tm.team_id = pt.team_id
                WHERE tm.user_id = $2 AND tm.role = 'Leader'
            ) as has_permission
            "#,
            team_id,
            user.user_id.as_uuid()
        )
        .fetch_one(&*self.pool)
        .await?;

        Ok(result.has_permission.unwrap_or(false))
    }

    /// Check if user is team member (including sub-teams)
    pub async fn is_team_member(
        &self,
        user: &CurrentUser,
        team_id: &str,
    ) -> Result<bool, ApiError> {
        let result = sqlx::query!(
            r#"
            SELECT EXISTS(
                SELECT 1 
                FROM team_memberships 
                WHERE user_id = $1 AND team_id = $2
            ) as is_member
            "#,
            user.user_id.as_uuid(),
            team_id
        )
        .fetch_one(&*self.pool)
        .await?;

        Ok(result.is_member.unwrap_or(false))
    }

    /// Check if user can certify skills (global permission)
    pub fn can_certify_skills(&self, user: &CurrentUser) -> bool {
        self.is_admin(user) || user.roles.contains(&"skill_certifier".to_string())
    }
}
```

### React User Profile with Quality Metrics

```typescript
// Source: Project requirements + GitHub contribution graph pattern
// packages/web/src/features/users/components/UserProfileCard.tsx

import { Avatar, Card, Badge, Grid } from '@mui/material';
import { QualityMetricsGraph } from './QualityMetricsGraph';
import { SkillChip } from './SkillChip';

interface UserProfileCardProps {
  user: User;
  canEdit: boolean;
}

export function UserProfileCard({ user, canEdit }: UserProfileCardProps) {
  return (
    <Card>
      <Grid container spacing={2}>
        {/* Header */}
        <Grid item xs={12}>
          <Avatar 
            src={user.avatar_url} 
            alt={user.display_name}
            sx={{ width: 120, height: 120 }}
          >
            {getInitials(user.display_name)}
          </Avatar>
          <h1>{user.display_name}</h1>
          <p>{user.email}</p>
          {user.department && <Badge>{user.department}</Badge>}
        </Grid>

        {/* Skills Section */}
        <Grid item xs={12} md={6}>
          <h2>Skills & Certifications</h2>
          <div className="skill-chips">
            {user.skills.map(skill => (
              <SkillChip 
                key={skill.skill_id}
                skill={skill}
                onClick={() => showSkillDetails(skill)}
              />
            ))}
          </div>
        </Grid>

        {/* Quality Metrics */}
        <Grid item xs={12} md={6}>
          <h2>Quality Profile</h2>
          <QualityMetricsGraph 
            overall_score={user.quality_profile.overall_score}
            accuracy={user.quality_profile.accuracy_score}
            consistency={user.quality_profile.consistency_score}
          />
        </Grid>

        {/* Activity Graph (GitHub-style contribution graph) */}
        <Grid item xs={12}>
          <h2>Activity</h2>
          <ActivityContributionGraph userId={user.user_id} />
        </Grid>

        {/* Current Projects */}
        <Grid item xs={12}>
          <h2>Current Projects</h2>
          <ProjectAccordion 
            projects={user.active_projects}
            showConfidential={canEdit || hasPermission('view_confidential')}
          />
        </Grid>

        {/* Reporting Hierarchy */}
        {user.manager && (
          <Grid item xs={12}>
            <h2>Reports To</h2>
            <UserCard user={user.manager} />
          </Grid>
        )}
      </Grid>
    </Card>
  );
}
```

### Bulk Operations API

```rust
// Source: REST API best practices + project requirements
// apps/api/src/routes/admin.rs

use axum::{Json, extract::State};
use serde::{Deserialize, Serialize};
use crate::{ApiError, CurrentUser, AppState};

#[derive(Debug, Deserialize)]
pub struct BulkDeactivateRequest {
    pub user_ids: Vec<String>,
    pub reason: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct BulkOperationResponse {
    pub succeeded: Vec<String>,
    pub failed: Vec<BulkOperationError>,
    pub total: usize,
}

#[derive(Debug, Serialize)]
pub struct BulkOperationError {
    pub user_id: String,
    pub error: String,
}

/// Bulk deactivate users (admin only)
#[utoipa::path(
    post,
    path = "/admin/users/bulk-deactivate",
    tag = "admin",
    request_body = BulkDeactivateRequest,
    responses(
        (status = 200, description = "Bulk operation completed", body = BulkOperationResponse),
        (status = 403, description = "Admin permission required")
    )
)]
pub async fn bulk_deactivate_users(
    State(state): State<AppState>,
    current_user: CurrentUser,
    Json(req): Json<BulkDeactivateRequest>,
) -> Result<Json<BulkOperationResponse>, ApiError> {
    // Check admin permission
    if !state.permissions.is_admin(&current_user) {
        return Err(ApiError::Forbidden {
            code: "admin_required",
            message: "Only admins can perform bulk operations".into(),
        });
    }

    let mut succeeded = Vec::new();
    let mut failed = Vec::new();

    // Use transaction for atomicity
    let mut tx = state.db.begin().await?;

    for user_id in req.user_ids {
        match deactivate_user_tx(&mut tx, &user_id, &current_user.user_id).await {
            Ok(_) => succeeded.push(user_id),
            Err(e) => failed.push(BulkOperationError {
                user_id,
                error: e.to_string(),
            }),
        }
    }

    // Commit only if ALL succeeded (strict atomicity)
    if failed.is_empty() {
        tx.commit().await?;
    } else {
        tx.rollback().await?;
        return Err(ApiError::BadRequest {
            code: "bulk_operation_partial_failure",
            message: format!("{} operations failed", failed.len()),
        });
    }

    Ok(Json(BulkOperationResponse {
        total: succeeded.len() + failed.len(),
        succeeded,
        failed,
    }))
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| UUIDv4 for IDs | UUIDv7 time-ordered | PostgreSQL 18 (2025) | 50% reduction in WAL, better index performance |
| Formik for forms | React Hook Form | 2023-2024 | Zero dependencies, better TypeScript, minimal re-renders |
| React Table v7 | TanStack Table v8 | 2022 | Complete TypeScript rewrite, headless, tree-shakeable |
| Manual RBAC | axum-login + extractors | 2024-2025 | Compile-time permission checks, better ergonomics |
| Application-level audit | Database triggers | Long-standing | Captures ALL changes, simpler application code |
| Custom recursive queries | PostgreSQL SEARCH/CYCLE clauses | PostgreSQL 14+ | Cleaner syntax, cycle detection built-in |

**Deprecated/outdated:**
- **React Table v7:** Replaced by TanStack Table v8, no longer maintained
- **tower-cookies alone:** Use axum-extra's PrivateCookieJar for encrypted cookies
- **Manual JWT JWKS parsing:** Use jsonwebtoken's built-in JWKS support
- **Hardcoded proficiency levels:** Requirements specify configurable per skill type

## Open Questions

Things that couldn't be fully resolved:

1. **Avatar Source Priority**
   - What we know: Try Auth0/SSO first, fallback to initials, allow user override
   - What's unclear: Which Auth0 field contains avatar URL? How to sync when SSO updates it?
   - Recommendation: Check Auth0 user profile response, store `avatar_url` and `avatar_source` (sso/uploaded) in database

2. **Skill Proficiency Hierarchy UI**
   - What we know: Proficiency levels are user-defined and reorderable per skill type
   - What's unclear: UI for admin to define/reorder proficiency hierarchy per skill
   - Recommendation: Simple drag-and-drop list in skill type edit form, store as ordered JSONB array

3. **Permission Caching Strategy**
   - What we know: Permission checks involve recursive CTEs which could be slow at scale
   - What's unclear: Whether to cache permission results, and for how long
   - Recommendation: Start without caching. If performance issues arise, implement Redis cache with invalidation on team membership changes

4. **Bulk Operation Error Handling**
   - What we know: Bulk operations should be transactional
   - What's unclear: All-or-nothing vs partial success with rollback options
   - Recommendation: Default to all-or-nothing (rollback all if any fail), add `continue_on_error` flag for partial success mode if users request it

5. **Team Hierarchy Depth Limit**
   - What we know: Requirements say "unlimited nesting"
   - What's unclear: Practical depth limit for UI/UX and query performance
   - Recommendation: No database constraint, but warn in UI if depth exceeds 5 levels (org chart best practice)

## Sources

### Primary (HIGH confidence)

**PostgreSQL Official Documentation:**
- [WITH Queries (Common Table Expressions)](https://www.postgresql.org/docs/current/queries-with.html) - Recursive CTEs for hierarchical queries
- [Audit Trigger](https://wiki.postgresql.org/wiki/Audit_trigger) - Database-level audit logging patterns

**Rust Documentation:**
- [axum error handling](https://docs.rs/axum/latest/axum/error_handling/index.html) - Official error handling patterns
- [axum-login](https://docs.rs/axum-login) - Permission macros and auth middleware
- [axum-sqlx-tx](https://docs.rs/axum-sqlx-tx) - Automatic transaction management

**React/TypeScript Official Documentation:**
- [React Hook Form](https://react-hook-form.com/) - Form validation library
- [TanStack Table](https://tanstack.com/table/latest) - Headless table library
- [Material UI React Avatar](https://mui.com/material-ui/react-avatar/) - Avatar component

### Secondary (MEDIUM confidence)

**Rust Patterns (2025-2026):**
- [Rust Axum PostgreSQL CRUD patterns](https://codevoweb.com/rust-crud-api-example-with-axum-and-postgresql/) - REST API patterns
- [Building Scalable RBAC in Rust](https://basillica.medium.com/building-a-scalable-rbac-system-in-rust-with-permission-scopes-0355f72fb491) - Permission architecture
- [PostgreSQL UUID v7 Performance](https://medium.com/@ntiinsd/uuid-v7-in-postgresql-the-tiny-choice-that-quietly-destroys-insert-performance-and-the-one-line-749d51af1978) - UUID v7 indexing considerations

**PostgreSQL Patterns:**
- [PostgreSQL Recursive Queries](https://neon.com/postgresql/postgresql-tutorial/postgresql-recursive-query) - Hierarchical data patterns
- [PostgreSQL Self-Join](https://neon.com/postgresql/postgresql-tutorial/postgresql-self-join) - Parent-child relationships
- [Trigger-Based Audit Logging](https://medium.com/israeli-tech-radar/postgresql-trigger-based-audit-log-fd9d9d5e412c) - Audit implementation

**React Patterns (2026):**
- [React Form Libraries 2026](https://blog.croct.com/post/best-react-form-libraries) - Form library comparison
- [React Admin Dashboard Templates](https://mui.com/store/collections/free-react-dashboard/) - Admin UI patterns
- [TanStack Table Bulk Selection](https://www.shadcn.io/blocks/tables-bulk-actions) - Bulk operations UI

### Tertiary (LOW confidence)

**Industry Patterns:**
- [Skill Proficiency Levels](https://www.talentguard.com/what-are-proficiency-levels) - 5-level proficiency systems
- [Certification Tracking Software](https://www.talentguard.com/certification-management-software) - Expiration and grace period patterns
- [Admin Dashboard Patterns](https://www.weweb.io/blog/admin-dashboard-ultimate-guide-templates-examples) - User management UI best practices

## Metadata

**Confidence breakdown:**
- Standard stack (Backend): HIGH - sqlx and axum patterns are established in project
- Standard stack (Frontend): MEDIUM - React Hook Form and TanStack Table are industry standard but not yet integrated
- Architecture patterns: HIGH - PostgreSQL recursive CTEs are well-documented, permission extractors follow Axum patterns
- RBAC implementation: MEDIUM - Custom approach based on requirements, not using existing framework
- Skill certification: MEDIUM - Industry patterns adapted to project requirements
- Pitfalls: HIGH - Based on documented PostgreSQL/Rust/React gotchas

**Research date:** 2026-01-28
**Valid until:** 2026-02-28 (30 days - stable domain with mature libraries)

**Notes:**
- Project already has solid foundation from Phases 1-3 (UUID v7, CurrentUser, ApiError, audit logging structure)
- Hybrid RBAC model (2 global + scoped permissions) is simpler than typical enterprise RBAC, avoiding heavyweight frameworks
- Hierarchical teams with unlimited nesting and cascade permissions is the most complex technical challenge
- Skill expiration with soft/hard blocking requires careful database query design for consistency
- React admin UI can leverage established component libraries (MUI/shadcn) for rapid development
