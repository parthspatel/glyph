# Glyph — Data Annotation Platform

## Vision

Glyph is a production-ready, enterprise-grade data annotation platform that enables organizations to manage the complete lifecycle of human annotation for machine learning. It provides configurable workflows, quality management, and extensibility through a plugin architecture.

## Problem Statement

Organizations building ML systems need to:
1. Collect high-quality labeled data at scale (100k+ tasks)
2. Manage distributed annotation teams with varying skill levels
3. Ensure annotation quality through consensus, review, and gold standards
4. Customize annotation interfaces for diverse data types (text, images, audio)
5. Integrate with existing ML pipelines and data infrastructure

Existing solutions are either:
- Too rigid (fixed workflows, limited customization)
- Too expensive (per-seat licensing, vendor lock-in)
- Missing enterprise features (SSO, audit trails, compliance)

## Solution

Glyph provides:

### Core Capabilities
- **Flexible Workflow Engine**: Single annotation, multi-annotation with consensus, custom DAG workflows with conditional branching
- **Configurable Layouts**: Nunjucks-based templating for annotation UIs without code deployment
- **Quality Management**: Inter-annotator agreement, gold standard evaluation, quality profiles
- **RBAC & Team Management**: Skills, roles, teams with hierarchical permissions
- **Plugin Architecture**: WASM-based extensibility for custom hooks and evaluators

### Technical Excellence
- **Scale**: 100k+ tasks, 150+ concurrent users
- **Performance**: <100ms API response time (p95)
- **Reliability**: 99.9% uptime target
- **Security**: JWT + Auth0 + SSO, full audit logging

## Target Users

| Role | Primary Needs |
|------|--------------|
| **Annotators** | Fast, intuitive UI; clear task queue; keyboard shortcuts |
| **Reviewers** | Efficient approval workflow; quality metrics visibility |
| **Team Leads** | Workload balancing; team performance tracking |
| **Project Admins** | Workflow configuration; goal tracking; data export |
| **System Admins** | User management; system health; compliance |

## Technology Stack

| Layer | Technology |
|-------|------------|
| Backend | Rust + Axum |
| Frontend | React 18 + TypeScript 5 |
| Database | PostgreSQL 15+ (partitioned) |
| Cache | Redis 7+ |
| Messaging | NATS |
| Plugins | WASM (wasmtime) + Nunjucks |
| Auth | JWT + Auth0 + SSO |
| Infrastructure | Kubernetes (AKS), Helm, Terraform |
| CI/CD | k3s (dev), GitHub Actions |
| Storage | S3-compatible buckets |
| Notifications | Email (SMTP) |
| Pipelines | Airflow (extensible interface) |

## Team

- 2 Frontend Engineers
- 2 Backend Engineers  
- 1 DevOps Engineer
- 3 AI Engineers (ML features deferred to v2)

## Success Criteria (v1.0)

1. **Functional**: Complete annotation lifecycle working end-to-end
2. **Scale**: Handle 100k tasks with 150 concurrent users
3. **Quality**: All workflow types operational (single, multi-adjudication, custom)
4. **Security**: Auth0 SSO, RBAC, audit logging in place
5. **Operations**: Deployed to AKS with monitoring and alerting

## Out of Scope (v1.0)

- ML-powered AI suggestions (v2)
- Active learning integration (v2)
- Mobile annotation interface (v2)
- Multi-tenancy / white-labeling (v2)

## Reference Documents

- [Product Requirements](/docs/design/product-requirements.md) — Full PRD (~8500 lines)
- [REQUIREMENTS.md](./.planning/REQUIREMENTS.md) — Scoped requirements with REQ-IDs
- [ROADMAP.md](./.planning/ROADMAP.md) — Phase breakdown and timeline
