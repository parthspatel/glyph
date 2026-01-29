# Phase 4: User & Team Management - Context

**Gathered:** 2026-01-28
**Status:** Ready for planning

<domain>
## Phase Boundary

Full CRUD for users and teams, skill/role management, RBAC permissions, and management UIs. Users can be created, configured with skills and roles, organized into hierarchical teams, and managed through admin interfaces.

NOT in scope: Project assignment, task assignment, workflow permissions (Phase 5+).

</domain>

<decisions>
## Implementation Decisions

### User Profiles
- Detailed profiles, publicly visible within org (academic directory style)
- Full contact info: name, email, timezone, other contact details
- Structured fields (department, expertise areas, languages) + optional free-form bio
- Avatar: try Auth0/SSO first, fallback to initials, optional user override
- Badges and certifications system alongside skills
- Real-time workload stats + historical throughput as GitHub-style contribution graph
- Active projects shown by default, collapsible accordion for full history (sorted by last active)
- Project visibility can be restricted per project for confidential work
- Show reporting hierarchy if available — pull from SSO if possible, manual override available
- Automatic status based on user activity (system infers availability)
- Full audit trail for all profile changes
- No admin notes field, no external profile links, no tenure display

### Profile Editing (Tiered)
- Users edit: bio, contact info, avatar
- Admins edit: roles, team assignments
- Certifiers edit: skill certifications

### Skills & Certification
- Admin and designated certifiers only (no self-claim)
- Skill expiration configurable per skill type (e.g., 6 months, 1 year)
- Soft expire with configurable grace period — user flagged but can continue, hard block after grace
- Skill chips at a glance (name + status), detail view shows full attribution (certifier, date, expiration)
- Optional proficiency levels per skill type (`Option<SkillProficiency>`)
- Proficiency enum defined per skill type, hierarchy is user-defined and reorderable
- One proficiency level per skill at a time — upgrading replaces previous
- Languages handled through skills system if needed, no separate section

### Quality Metrics Visibility
- Fully transparent by default (everyone sees everyone's scores)
- Build infrastructure for role-based visibility toggle (for future use)

### Team Structure
- Hierarchical teams — teams can contain sub-teams
- Unlimited nesting depth
- Simple roles: Leader and Member
- Users can belong to unlimited teams
- One person can lead multiple teams
- Teams can have multiple leaders with equal authority
- Team leadership cascades automatically to all sub-teams

### Team Leader Permissions
- Add/remove members
- Edit team info
- View member metrics
- Reassign tasks within team
- Manage sub-teams

### Team Profiles
- Detailed team profiles (like user profiles) — description, member list, aggregate metrics, activity feed

### Permission Model (Hybrid RBAC)
- Global Roles: Admin, User (just two)
- Scoped Permissions:
  - `team:lead(team_id)` — cascades to sub-teams automatically
  - `team:member(team_id)` — implicit from membership
  - `skill:certifier` — global, can certify any skill type
- Admin role handles all user management (no separate user:admin permission)
- Verbose permission denial — users see what permission they need
- Permission request workflow: out of band for v1 (Slack/email), built-in later
- Same audit log for permission changes and profile changes

### Admin Workflows
- User creation: combination of admin direct create, invite flow, and SSO auto-provision
- SSO auto-provisioned users: limited access until admin configures roles/skills/team
- Full bulk operations: create, deactivate, role assignment, team assignment
- Bulk via UI multi-select or copy-paste text input (no CSV upload)

### Claude's Discretion
- Exact UI layouts and component designs
- API pagination strategies
- Database indexing for performance
- Caching strategies for permission checks

</decisions>

<specifics>
## Specific Ideas

- Profiles like academic directories — open, detailed, transparent
- Quality metrics graph like GitHub contribution graph
- Skill chips (glanceable) + skill detail view (full attribution)
- Permission denial messages should be actionable ("Requires team:lead on team_xyz")

</specifics>

<deferred>
## Deferred Ideas

- User follow/favorite functionality — maybe v2
- Built-in permission request workflow — later phase
- Role-based visibility toggle for quality metrics — infrastructure built, toggle later

</deferred>

---

*Phase: 04-user-team-management*
*Context gathered: 2026-01-28*
