# Glyph

AI Data Annotation Platform - A full-stack annotation platform for building high-quality training datasets.

## Tech Stack

- **Backend**: Rust (Axum) + PostgreSQL 16 + Redis
- **Frontend**: TypeScript 5 / React 18 with pnpm
- **Plugin Runtime**: WASM (wasmtime)
- **Templates**: Nunjucks layouts

## Project Structure

```
glyph/
├── apps/                        # Deployable applications
│   ├── api/                     # Axum HTTP API server
│   ├── worker/                  # Background job processor
│   ├── cli/                     # Administration CLI
│   └── web/                     # React web application
│
├── libs/                        # Shared Rust libraries
│   ├── domain/                  # Core domain models + enums
│   ├── db/                      # PostgreSQL repository layer
│   ├── auth/                    # JWT + Auth0 integration
│   ├── common/                  # Shared utilities, tracing
│   ├── workflow-engine/         # State machine engine
│   ├── quality/                 # IAA metrics, scoring
│   └── plugins/                 # WASM runtime
│
├── packages/                    # TypeScript packages
│   └── @glyph/
│       ├── types/               # Shared types (typeshare)
│       └── ui/                  # Component library
│
├── infrastructure/              # Deployment infrastructure
│   ├── docker/                  # Dockerfiles
│   ├── helm/                    # Kubernetes Helm charts
│   ├── terraform/               # Azure infrastructure
│   └── k3s/                     # Local K3s config
│
├── migrations/                  # SQLx migrations
└── docs/                        # Documentation
```

## Getting Started

### Prerequisites

- [devenv](https://devenv.sh/) for development environment
- [direnv](https://direnv.net/) for automatic environment loading

### Setup

1. Clone the repository
2. Enter the devenv shell:
   ```bash
   devenv shell
   ```

3. Install frontend dependencies:
   ```bash
   pnpm install
   ```

4. Run database migrations:
   ```bash
   db-migrate
   ```

5. Start development servers:
   ```bash
   dev
   ```

## Development Commands

| Command | Description |
|---------|-------------|
| `dev` | Start all development servers |
| `dev-api` | Start Rust API server only |
| `dev-worker` | Start background worker |
| `dev-web` | Start frontend dev server only |
| `db-migrate` | Run database migrations |
| `db-reset` | Reset and re-run all migrations |
| `typegen` | Generate TypeScript types from Rust |
| `cargo test` | Run Rust tests |
| `pnpm test` | Run frontend tests |

## Architecture

### Hybrid Monorepo

- **apps/**: Deployable binaries and applications
- **libs/**: Shared Rust libraries with workspace dependencies
- **packages/**: TypeScript packages managed by pnpm workspaces

### Workflow Engine

Supports three workflow types:
- `single`: Simple annotation workflow
- `multi_adjudication`: Multiple annotators with consensus resolution
- `custom`: DAG-based custom workflows

### Quality Management

- Cohen's Kappa, Krippendorff's Alpha for IAA
- Gold standard tracking
- Automated quality actions

## CI/CD

- GitHub Actions for build, test, lint
- Docker multi-stage builds
- Helm charts for Kubernetes deployment
- Terraform for Azure infrastructure

## License

MIT
