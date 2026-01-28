# Phase 1: Foundation — Execution Plan

> **Goal**: Establish hybrid monorepo structure, CI/CD pipeline, and base infrastructure
> **Requirements**: REQ-INFRA-001, REQ-INFRA-002, REQ-INFRA-005
> **Team**: DevOps + BE1

---

## Current State Analysis

### Existing Structure
```
glyph/
├── crates/                    # Rust crates (flat, needs split)
│   ├── api/                   # → apps/api
│   ├── domain/                # → libs/domain
│   ├── infrastructure/        # → libs/db + libs/common
│   ├── plugins/               # → libs/plugins
│   └── services/              # → libs/workflow-engine + libs/quality
├── packages/
│   ├── @glyph/                # → packages/@glyph/ (keep)
│   └── web/                   # → apps/web
├── migrations/                # Keep in place
├── layouts/                   # Keep in place
└── services/ml-suggestions/   # Defer to v2
```

### What Exists
- Cargo workspace with `crates/*` member pattern
- pnpm workspace with `packages/*` and `packages/@glyph/*`
- devenv.nix with Postgres, Redis, and dev scripts
- Pre-commit hooks via devenv
- Basic domain models in `crates/domain`
- 6 SQL migrations

### What's Missing
- `apps/` and `libs/` directory split
- GitHub Actions CI/CD
- Docker multi-stage builds
- Helm charts and Terraform
- Infrastructure directory
- Health check endpoints
- Structured logging/tracing setup

---

## Execution Tasks

### Task 1.1: Create Directory Structure
**Effort**: Small | **Risk**: Low

Create the new directory hierarchy without moving files yet.

```bash
# Create apps directory
mkdir -p apps/api/src/{routes,middleware,extractors}
mkdir -p apps/worker/src/jobs
mkdir -p apps/cli/src/commands
mkdir -p apps/web  # Will move existing

# Create libs directory
mkdir -p libs/domain/src
mkdir -p libs/db/src/repositories
mkdir -p libs/workflow-engine/src/steps
mkdir -p libs/quality/src/evaluators
mkdir -p libs/plugins/src/wit
mkdir -p libs/auth/src
mkdir -p libs/common/src

# Create infrastructure directory
mkdir -p infrastructure/helm/{glyph,api,worker,web}/templates
mkdir -p infrastructure/terraform/{modules,environments}/{dev,prod}
mkdir -p infrastructure/terraform/modules/{aks,postgresql,redis,storage,keyvault}
mkdir -p infrastructure/docker
mkdir -p infrastructure/k3s

# Create tools directory
mkdir -p tools/scripts
```

**Verification**: All directories exist with correct structure.

---

### Task 1.2: Migrate Rust Crates to New Layout
**Effort**: Medium | **Risk**: Medium

Move existing crates to new locations and update Cargo.toml.

#### 1.2.1: Move API crate to apps/api
```bash
# Move contents
mv crates/api/src/* apps/api/src/
mv crates/api/Cargo.toml apps/api/
```

Update `apps/api/Cargo.toml` dependencies:
```toml
[dependencies]
glyph-domain = { path = "../../libs/domain" }
glyph-db = { path = "../../libs/db" }
glyph-auth = { path = "../../libs/auth" }
glyph-common = { path = "../../libs/common" }
# ... rest unchanged
```

#### 1.2.2: Move domain crate to libs/domain
```bash
mv crates/domain/src/* libs/domain/src/
mv crates/domain/Cargo.toml libs/domain/
```

#### 1.2.3: Split infrastructure crate
```bash
# Move to libs/db (database layer)
mv crates/infrastructure/src/db/* libs/db/src/ 2>/dev/null || true
mv crates/infrastructure/src/repositories/* libs/db/src/repositories/ 2>/dev/null || true

# Move common utilities to libs/common
mv crates/infrastructure/src/config.rs libs/common/src/ 2>/dev/null || true
mv crates/infrastructure/src/error.rs libs/common/src/ 2>/dev/null || true
```

Create new `libs/db/Cargo.toml`:
```toml
[package]
name = "glyph-db"
version.workspace = true
edition.workspace = true

[dependencies]
glyph-domain = { path = "../domain" }
sqlx.workspace = true
deadpool-redis.workspace = true
tokio.workspace = true
async-trait.workspace = true
thiserror.workspace = true
tracing.workspace = true
```

Create new `libs/common/Cargo.toml`:
```toml
[package]
name = "glyph-common"
version.workspace = true
edition.workspace = true

[dependencies]
config.workspace = true
dotenvy.workspace = true
thiserror.workspace = true
tracing.workspace = true
tracing-subscriber.workspace = true
```

#### 1.2.4: Move plugins crate
```bash
mv crates/plugins/src/* libs/plugins/src/
mv crates/plugins/Cargo.toml libs/plugins/
```

Update path in `libs/plugins/Cargo.toml`.

#### 1.2.5: Split services crate
The services crate needs to be split into `libs/workflow-engine` and `libs/quality`.

```bash
# Move workflow-related code
mv crates/services/src/workflow/* libs/workflow-engine/src/ 2>/dev/null || true

# Move quality-related code  
mv crates/services/src/quality/* libs/quality/src/ 2>/dev/null || true
```

Create placeholder `libs/workflow-engine/Cargo.toml` and `libs/quality/Cargo.toml`.

#### 1.2.6: Create stub crates for missing libs

**libs/auth/Cargo.toml**:
```toml
[package]
name = "glyph-auth"
version.workspace = true
edition.workspace = true

[dependencies]
glyph-domain = { path = "../domain" }
tokio.workspace = true
async-trait.workspace = true
thiserror.workspace = true
tracing.workspace = true
uuid.workspace = true
chrono.workspace = true
serde.workspace = true
serde_json.workspace = true
```

**libs/auth/src/lib.rs**:
```rust
//! Authentication library for Glyph
//! 
//! Provides JWT handling, Auth0 integration, and RBAC.

pub mod jwt;
pub mod rbac;

// Placeholder - to be implemented in Phase 3
```

---

### Task 1.3: Update Root Cargo.toml
**Effort**: Small | **Risk**: Low

Update workspace members to reflect new structure.

```toml
[workspace]
resolver = "2"
members = [
    "apps/api",
    "apps/worker",
    "apps/cli",
    "libs/domain",
    "libs/db",
    "libs/workflow-engine",
    "libs/quality",
    "libs/plugins",
    "libs/auth",
    "libs/common",
]

[workspace.package]
version = "0.1.0"
edition = "2021"
authors = ["Glyph Team"]
license = "MIT"
repository = "https://github.com/parthpatel/glyph"

[workspace.dependencies]
# Internal crates
glyph-domain = { path = "libs/domain" }
glyph-db = { path = "libs/db" }
glyph-workflow-engine = { path = "libs/workflow-engine" }
glyph-quality = { path = "libs/quality" }
glyph-plugins = { path = "libs/plugins" }
glyph-auth = { path = "libs/auth" }
glyph-common = { path = "libs/common" }

# ... existing external dependencies unchanged
```

**Verification**: `cargo check --workspace` passes.

---

### Task 1.4: Move Web Package to apps/web
**Effort**: Small | **Risk**: Low

```bash
mv packages/web/* apps/web/
rmdir packages/web
```

Update `apps/web/package.json` if needed (name should stay `@glyph/web`).

---

### Task 1.5: Update pnpm-workspace.yaml
**Effort**: Small | **Risk**: Low

```yaml
packages:
  - 'apps/web'
  - 'packages/@glyph/*'
```

**Verification**: `pnpm install` succeeds.

---

### Task 1.6: Update devenv.nix Scripts
**Effort**: Small | **Risk**: Low

Update paths in devenv.nix to reflect new structure:

```nix
scripts = {
  # ... existing scripts
  
  dev-api.exec = ''
    cargo run --package glyph-api
  '';

  dev-web.exec = ''
    pnpm --filter @glyph/web dev
  '';

  dev.exec = ''
    echo "Starting development servers..."
    echo "API: http://localhost:3000"
    echo "Web: http://localhost:5173"
    (cargo run --package glyph-api &)
    pnpm --filter @glyph/web dev
  '';
};
```

Also update typegen script in package.json:
```json
"typegen": "typeshare --lang typescript --output-file packages/@glyph/types/src/generated.ts libs/"
```

---

### Task 1.7: Create GitHub Actions CI Pipeline
**Effort**: Medium | **Risk**: Low

Create `.github/workflows/ci.yml`:

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

env:
  CARGO_TERM_COLOR: always
  RUST_BACKTRACE: 1

jobs:
  rust-check:
    name: Rust Check
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Install Rust toolchain
        uses: dtolnay/rust-action@stable
        with:
          components: rustfmt, clippy
      
      - name: Cache cargo
        uses: Swatinem/rust-cache@v2
        with:
          workspaces: ". -> target"
      
      - name: Check formatting
        run: cargo fmt --all -- --check
      
      - name: Clippy
        run: cargo clippy --workspace --all-targets -- -D warnings
      
      - name: Build
        run: cargo build --workspace
      
      - name: Test
        run: cargo test --workspace

  typescript-check:
    name: TypeScript Check
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup pnpm
        uses: pnpm/action-setup@v2
        with:
          version: 9
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'pnpm'
      
      - name: Install dependencies
        run: pnpm install --frozen-lockfile
      
      - name: Type check
        run: pnpm typecheck
      
      - name: Lint
        run: pnpm lint
      
      - name: Build
        run: pnpm build
      
      - name: Test
        run: pnpm test

  docker-build:
    name: Docker Build
    runs-on: ubuntu-latest
    needs: [rust-check, typescript-check]
    steps:
      - uses: actions/checkout@v4
      
      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3
      
      - name: Build API image
        uses: docker/build-push-action@v5
        with:
          context: .
          file: infrastructure/docker/api.Dockerfile
          push: false
          tags: glyph-api:${{ github.sha }}
          cache-from: type=gha
          cache-to: type=gha,mode=max
      
      - name: Build Web image
        uses: docker/build-push-action@v5
        with:
          context: .
          file: infrastructure/docker/web.Dockerfile
          push: false
          tags: glyph-web:${{ github.sha }}
          cache-from: type=gha
          cache-to: type=gha,mode=max
```

Create `.github/CODEOWNERS`:
```
# Backend team owns Rust code
/apps/api/ @backend-team
/apps/worker/ @backend-team
/libs/ @backend-team
/migrations/ @backend-team

# Frontend team owns TypeScript/React
/apps/web/ @frontend-team
/packages/@glyph/components/ @frontend-team
/packages/@glyph/layout-runtime/ @frontend-team
/layouts/ @frontend-team

# DevOps owns infrastructure
/infrastructure/ @devops-team
/.github/ @devops-team
```

Create `.github/pull_request_template.md`:
```markdown
## Description

<!-- Describe your changes -->

## Type of Change

- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Checklist

- [ ] Tests pass locally
- [ ] Code follows project style
- [ ] Self-review completed
- [ ] Documentation updated (if applicable)

## Related Issues

<!-- Link to related issues: Fixes #123 -->
```

---

### Task 1.8: Create Docker Multi-Stage Builds
**Effort**: Medium | **Risk**: Low

Create `infrastructure/docker/api.Dockerfile`:

```dockerfile
# ============================================
# Stage 1: Build
# ============================================
FROM rust:1.83-bookworm AS builder

WORKDIR /app

# Install build dependencies
RUN apt-get update && apt-get install -y \
    pkg-config \
    libssl-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy workspace files
COPY Cargo.toml Cargo.lock ./
COPY apps/ apps/
COPY libs/ libs/

# Build release binary
RUN cargo build --release --package glyph-api

# ============================================
# Stage 2: Runtime
# ============================================
FROM debian:bookworm-slim AS runtime

WORKDIR /app

# Install runtime dependencies
RUN apt-get update && apt-get install -y \
    ca-certificates \
    libssl3 \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user
RUN useradd -m -u 1000 glyph
USER glyph

# Copy binary from builder
COPY --from=builder /app/target/release/glyph-server /app/glyph-server

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1

EXPOSE 3000

ENTRYPOINT ["/app/glyph-server"]
```

Create `infrastructure/docker/web.Dockerfile`:

```dockerfile
# ============================================
# Stage 1: Dependencies
# ============================================
FROM node:22-alpine AS deps

WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@9 --activate

# Copy package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/web/package.json apps/web/
COPY packages/@glyph/types/package.json packages/@glyph/types/
COPY packages/@glyph/api-client/package.json packages/@glyph/api-client/
COPY packages/@glyph/components/package.json packages/@glyph/components/
COPY packages/@glyph/layout-runtime/package.json packages/@glyph/layout-runtime/

# Install dependencies
RUN pnpm install --frozen-lockfile

# ============================================
# Stage 2: Build
# ============================================
FROM node:22-alpine AS builder

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@9 --activate

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/web/node_modules ./apps/web/node_modules
COPY . .

# Build all packages
RUN pnpm build

# ============================================
# Stage 3: Runtime
# ============================================
FROM nginx:alpine AS runtime

# Copy built assets
COPY --from=builder /app/apps/web/dist /usr/share/nginx/html

# Copy nginx config
COPY infrastructure/docker/nginx.conf /etc/nginx/nginx.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

Create `infrastructure/docker/nginx.conf`:

```nginx
events {
    worker_connections 1024;
}

http {
    include       /etc/nginx/mime.types;
    default_type  application/octet-stream;

    sendfile        on;
    keepalive_timeout  65;

    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml;

    server {
        listen 80;
        server_name localhost;

        root /usr/share/nginx/html;
        index index.html;

        # SPA routing - serve index.html for all routes
        location / {
            try_files $uri $uri/ /index.html;
        }

        # API proxy (when running with docker-compose)
        location /api/ {
            proxy_pass http://api:3000/api/;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_cache_bypass $http_upgrade;
        }

        # Health check
        location /health {
            return 200 'OK';
            add_header Content-Type text/plain;
        }
    }
}
```

Create `infrastructure/docker/docker-compose.yml`:

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: glyph
      POSTGRES_PASSWORD: glyph
      POSTGRES_DB: glyph
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U glyph"]
      interval: 5s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 5s
      retries: 5

  api:
    build:
      context: ../..
      dockerfile: infrastructure/docker/api.Dockerfile
    ports:
      - "3000:3000"
    environment:
      DATABASE_URL: postgres://glyph:glyph@postgres:5432/glyph
      REDIS_URL: redis://redis:6379
      RUST_LOG: info
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy

  web:
    build:
      context: ../..
      dockerfile: infrastructure/docker/web.Dockerfile
    ports:
      - "8080:80"
    depends_on:
      - api

volumes:
  postgres_data:
```

---

### Task 1.9: Create Health Check Endpoints
**Effort**: Small | **Risk**: Low

Add health check routes to `apps/api/src/routes/health.rs`:

```rust
use axum::{extract::State, http::StatusCode, Json, Router, routing::get};
use serde::Serialize;
use sqlx::PgPool;

#[derive(Serialize)]
pub struct HealthResponse {
    pub status: &'static str,
    pub version: &'static str,
}

#[derive(Serialize)]
pub struct ReadyResponse {
    pub status: &'static str,
    pub checks: HealthChecks,
}

#[derive(Serialize)]
pub struct HealthChecks {
    pub database: CheckStatus,
    pub redis: CheckStatus,
}

#[derive(Serialize)]
pub struct CheckStatus {
    pub status: &'static str,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
}

/// GET /health - Liveness probe
pub async fn health() -> Json<HealthResponse> {
    Json(HealthResponse {
        status: "ok",
        version: env!("CARGO_PKG_VERSION"),
    })
}

/// GET /ready - Readiness probe
pub async fn ready(
    State(pool): State<PgPool>,
    // State(redis): State<deadpool_redis::Pool>,
) -> Result<Json<ReadyResponse>, StatusCode> {
    // Check database
    let db_check = match sqlx::query("SELECT 1").execute(&pool).await {
        Ok(_) => CheckStatus { status: "ok", error: None },
        Err(e) => CheckStatus { status: "error", error: Some(e.to_string()) },
    };

    // Check Redis (placeholder)
    let redis_check = CheckStatus { status: "ok", error: None };

    let all_ok = db_check.status == "ok" && redis_check.status == "ok";

    let response = ReadyResponse {
        status: if all_ok { "ok" } else { "degraded" },
        checks: HealthChecks {
            database: db_check,
            redis: redis_check,
        },
    };

    if all_ok {
        Ok(Json(response))
    } else {
        Err(StatusCode::SERVICE_UNAVAILABLE)
    }
}

pub fn router() -> Router<PgPool> {
    Router::new()
        .route("/health", get(health))
        .route("/ready", get(ready))
}
```

---

### Task 1.10: Setup Base Tracing and Logging
**Effort**: Small | **Risk**: Low

Create `libs/common/src/telemetry.rs`:

```rust
use tracing_subscriber::{
    fmt,
    layer::SubscriberExt,
    util::SubscriberInitExt,
    EnvFilter,
};

/// Initialize tracing/logging for the application.
/// 
/// Uses RUST_LOG env var for filtering.
/// Outputs JSON in production, pretty format in development.
pub fn init_tracing() {
    let env_filter = EnvFilter::try_from_default_env()
        .unwrap_or_else(|_| EnvFilter::new("info"));

    let fmt_layer = if std::env::var("RUST_LOG_FORMAT").as_deref() == Ok("json") {
        fmt::layer()
            .json()
            .with_target(true)
            .with_file(true)
            .with_line_number(true)
            .boxed()
    } else {
        fmt::layer()
            .pretty()
            .with_target(true)
            .boxed()
    };

    tracing_subscriber::registry()
        .with(env_filter)
        .with(fmt_layer)
        .init();
}
```

Update `libs/common/src/lib.rs`:

```rust
//! Common utilities for Glyph
//!
//! Provides shared configuration, error handling, and telemetry.

pub mod config;
pub mod error;
pub mod telemetry;

pub use telemetry::init_tracing;
```

---

### Task 1.11: Create Stub Worker and CLI Apps
**Effort**: Small | **Risk**: Low

Create `apps/worker/Cargo.toml`:

```toml
[package]
name = "glyph-worker"
version.workspace = true
edition.workspace = true

[[bin]]
name = "glyph-worker"
path = "src/main.rs"

[dependencies]
glyph-domain = { path = "../../libs/domain" }
glyph-db = { path = "../../libs/db" }
glyph-common = { path = "../../libs/common" }

tokio.workspace = true
tracing.workspace = true
tracing-subscriber.workspace = true

[lints]
workspace = true
```

Create `apps/worker/src/main.rs`:

```rust
//! Glyph Background Worker
//!
//! Processes async jobs: assignments, quality evaluation, exports, notifications.

use glyph_common::init_tracing;

#[tokio::main]
async fn main() {
    init_tracing();
    tracing::info!("Starting Glyph Worker...");
    
    // TODO: Initialize job processor
    // TODO: Connect to message queue
    // TODO: Start job loop
    
    tracing::info!("Worker started. Waiting for jobs...");
    
    // Keep running
    tokio::signal::ctrl_c().await.expect("Failed to listen for ctrl-c");
    tracing::info!("Shutting down worker...");
}
```

Create `apps/cli/Cargo.toml`:

```toml
[package]
name = "glyph-cli"
version.workspace = true
edition.workspace = true

[[bin]]
name = "glyph"
path = "src/main.rs"

[dependencies]
glyph-domain = { path = "../../libs/domain" }
glyph-db = { path = "../../libs/db" }
glyph-common = { path = "../../libs/common" }

tokio.workspace = true
clap = { version = "4", features = ["derive"] }
tracing.workspace = true
tracing-subscriber.workspace = true

[lints]
workspace = true
```

Create `apps/cli/src/main.rs`:

```rust
//! Glyph CLI
//!
//! Administrative command-line tool for Glyph.

use clap::{Parser, Subcommand};

#[derive(Parser)]
#[command(name = "glyph")]
#[command(about = "Glyph administration CLI")]
struct Cli {
    #[command(subcommand)]
    command: Commands,
}

#[derive(Subcommand)]
enum Commands {
    /// User management commands
    User {
        #[command(subcommand)]
        action: UserCommands,
    },
    /// Project management commands
    Project {
        #[command(subcommand)]
        action: ProjectCommands,
    },
}

#[derive(Subcommand)]
enum UserCommands {
    /// List all users
    List,
    /// Create a new user
    Create {
        #[arg(short, long)]
        email: String,
    },
}

#[derive(Subcommand)]
enum ProjectCommands {
    /// List all projects
    List,
}

#[tokio::main]
async fn main() {
    let cli = Cli::parse();

    match cli.command {
        Commands::User { action } => match action {
            UserCommands::List => {
                println!("Listing users... (not implemented)");
            }
            UserCommands::Create { email } => {
                println!("Creating user with email: {} (not implemented)", email);
            }
        },
        Commands::Project { action } => match action {
            ProjectCommands::List => {
                println!("Listing projects... (not implemented)");
            }
        },
    }
}
```

---

### Task 1.12: Create Infrastructure Scaffolds
**Effort**: Medium | **Risk**: Low

Create `infrastructure/helm/glyph/Chart.yaml`:

```yaml
apiVersion: v2
name: glyph
description: Glyph Data Annotation Platform
type: application
version: 0.1.0
appVersion: "0.1.0"

dependencies:
  - name: api
    version: "0.1.0"
    repository: "file://../api"
  - name: worker
    version: "0.1.0"
    repository: "file://../worker"
  - name: web
    version: "0.1.0"
    repository: "file://../web"
```

Create `infrastructure/helm/glyph/values.yaml`:

```yaml
# Global values
global:
  imageRegistry: ""
  imagePullSecrets: []

# API configuration
api:
  replicaCount: 2
  image:
    repository: glyph-api
    tag: latest
    pullPolicy: IfNotPresent
  service:
    type: ClusterIP
    port: 3000
  resources:
    limits:
      cpu: 500m
      memory: 512Mi
    requests:
      cpu: 100m
      memory: 256Mi

# Worker configuration
worker:
  replicaCount: 2
  image:
    repository: glyph-worker
    tag: latest

# Web configuration
web:
  replicaCount: 2
  image:
    repository: glyph-web
    tag: latest
  service:
    type: ClusterIP
    port: 80

# External dependencies
postgresql:
  enabled: false  # Use external
  host: ""
  port: 5432
  database: glyph
  existingSecret: glyph-db-credentials

redis:
  enabled: false  # Use external
  host: ""
  port: 6379
```

Create `infrastructure/terraform/main.tf`:

```hcl
# Glyph Infrastructure - Main Entry Point

terraform {
  required_version = ">= 1.5.0"
  
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.0"
    }
  }

  backend "azurerm" {
    # Configure in environment-specific tfvars
  }
}

provider "azurerm" {
  features {}
}

# Module references - to be configured per environment
# See environments/dev/ and environments/prod/
```

Create `infrastructure/terraform/modules/aks/main.tf`:

```hcl
# AKS Cluster Module

variable "cluster_name" {
  type = string
}

variable "resource_group_name" {
  type = string
}

variable "location" {
  type = string
}

variable "node_count" {
  type    = number
  default = 3
}

variable "node_size" {
  type    = string
  default = "Standard_D2s_v3"
}

resource "azurerm_kubernetes_cluster" "main" {
  name                = var.cluster_name
  location            = var.location
  resource_group_name = var.resource_group_name
  dns_prefix          = var.cluster_name

  default_node_pool {
    name       = "default"
    node_count = var.node_count
    vm_size    = var.node_size
  }

  identity {
    type = "SystemAssigned"
  }

  tags = {
    Environment = terraform.workspace
    Project     = "glyph"
  }
}

output "kube_config" {
  value     = azurerm_kubernetes_cluster.main.kube_config_raw
  sensitive = true
}

output "cluster_id" {
  value = azurerm_kubernetes_cluster.main.id
}
```

---

### Task 1.13: Cleanup Old Structure
**Effort**: Small | **Risk**: Low

After all migrations are verified working:

```bash
# Remove old crates directory (after confirming everything works)
rm -rf crates/

# Remove empty packages/web if moved
rmdir packages/web 2>/dev/null || true

# Remove services/ml-suggestions (defer to v2)
rm -rf services/
```

---

### Task 1.14: Update Documentation
**Effort**: Small | **Risk**: Low

Update `README.md` with new structure and commands.

Update `CLAUDE.md` with any new development patterns.

---

## Execution Order

```
┌─────────────────────────────────────────────────────────────────┐
│  Task 1.1: Create Directory Structure                          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Task 1.2: Migrate Rust Crates                                  │
│  Task 1.4: Move Web Package                                     │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Task 1.3: Update Root Cargo.toml                               │
│  Task 1.5: Update pnpm-workspace.yaml                           │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  CHECKPOINT: cargo check && pnpm install                        │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Task 1.6: Update devenv.nix                                    │
│  Task 1.9: Create Health Endpoints                              │
│  Task 1.10: Setup Tracing                                       │
│  Task 1.11: Create Stub Apps                                    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  CHECKPOINT: cargo build && pnpm build                          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Task 1.7: Create GitHub Actions                                │
│  Task 1.8: Create Docker Builds                                 │
│  Task 1.12: Create Infrastructure Scaffolds                     │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Task 1.13: Cleanup Old Structure                               │
│  Task 1.14: Update Documentation                                │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  FINAL: Full CI run, Docker build test                          │
└─────────────────────────────────────────────────────────────────┘
```

---

## Success Criteria

| Criterion | Verification |
|-----------|--------------|
| `cargo build --workspace` passes | All Rust crates compile |
| `cargo test --workspace` passes | All Rust tests pass |
| `cargo clippy --workspace` passes | No lint warnings |
| `pnpm install` succeeds | Dependencies resolve |
| `pnpm build` succeeds | TypeScript compiles |
| `pnpm typecheck` succeeds | No type errors |
| CI pipeline runs on PR | GitHub Actions green |
| Docker images build | `docker compose build` succeeds |
| Health endpoints work | `/health` returns 200 |
| Build time < 5 min | CI completes quickly |

---

## Risk Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| Import path breaks | High | Make atomic commits per crate move |
| CI fails on first run | Medium | Test locally with `act` before push |
| Docker build cache issues | Low | Use multi-stage builds with layer caching |
| pnpm workspace resolution | Medium | Verify with `pnpm install` after each change |

---

## Commit Strategy

1. **Commit 1**: Create directory structure (Task 1.1)
2. **Commit 2**: Migrate domain and common libs (Task 1.2.2, 1.2.3)
3. **Commit 3**: Migrate remaining libs (Task 1.2.4, 1.2.5, 1.2.6)
4. **Commit 4**: Migrate apps (Task 1.2.1, 1.4)
5. **Commit 5**: Update workspace configs (Task 1.3, 1.5, 1.6)
6. **Commit 6**: Add health and telemetry (Task 1.9, 1.10)
7. **Commit 7**: Add stub apps (Task 1.11)
8. **Commit 8**: Add CI pipeline (Task 1.7)
9. **Commit 9**: Add Docker builds (Task 1.8)
10. **Commit 10**: Add infrastructure scaffolds (Task 1.12)
11. **Commit 11**: Cleanup and docs (Task 1.13, 1.14)

---

## Notes

- The `services/ml-suggestions` directory is intentionally removed - ML features are deferred to v2
- Infrastructure Helm/Terraform files are scaffolds - full implementation in Phase 14
- Worker and CLI apps are stubs - full implementation in Phase 2+
- Health endpoints will be expanded with more checks as services are added
