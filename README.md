# Glyph

AI Data Annotation Platform - A full-stack annotation platform for building high-quality training datasets.

## Tech Stack

- **Backend**: Rust (Axum) + PostgreSQL 16 + Redis + NATS
- **Frontend**: TypeScript 5 / React 18 with pnpm
- **Plugin Runtime**: WASM (wasmtime) + JavaScript (Deno)
- **ML Services**: Python 3.12 (FastAPI)
- **Templates**: Nunjucks/MDX layouts

## Project Structure

```
glyph/
├── crates/                      # Rust backend
│   ├── domain/                  # Core domain models + enums
│   ├── infrastructure/          # PostgreSQL, Redis, NATS
│   ├── services/                # Business logic
│   ├── plugins/                 # WASM + Deno runtime
│   └── api/                     # Axum HTTP handlers
│
├── packages/                    # TypeScript/React frontend
│   ├── @glyph/components/       # Tier 1 React components
│   ├── @glyph/layout-runtime/   # Nunjucks/MDX renderer
│   ├── @glyph/sdk/              # TypeScript SDK
│   ├── @glyph/types/            # Shared types
│   └── web/                     # Main web application
│
├── layouts/                     # Tier 2 Nunjucks templates
├── services/                    # Python ML services
├── migrations/                  # SQL migrations
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
| `dev-web` | Start frontend dev server only |
| `db-migrate` | Run database migrations |
| `db-reset` | Reset and re-run all migrations |
| `cargo test` | Run Rust tests |
| `pnpm test` | Run frontend tests |

## Architecture

### Three-Tier Component System

1. **Tier 1 - React Components**: Core annotation components (NERTagger, Classification, BoundingBox, etc.)
2. **Tier 2 - Nunjucks Templates**: Layout definitions that compose Tier 1 components
3. **Tier 3 - ML Services**: AI suggestions, quality prediction, active learning

### Workflow Engine

Supports three workflow types:
- `single`: Simple annotation workflow
- `multi_adjudication`: Multiple annotators with consensus resolution
- `custom`: DAG-based custom workflows

## Documentation

- [Product Requirements](docs/design/product-requirements.md)
- [PRD Cheatsheet](docs/design/PRD-CHEATSHEET.md)

## License

MIT
