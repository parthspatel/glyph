# Phase 5: Project Management - Context

**Gathered:** 2026-01-28
**Status:** Ready for planning

<domain>
## Phase Boundary

Configure projects with types, schemas, and data sources. Users create and manage annotation projects, define what data goes in (data sources), what annotations come out (schemas), and what skills annotators need. Project lifecycle management from Draft through Active, Paused, Completed, and Archived states.

</domain>

<decisions>
## Implementation Decisions

### Project Creation Flow
- Single form with collapsible sections (not wizard)
- Fixed section order: Basic Info → Project Type → Schema → Data Sources → Skill Requirements
- Smart collapse: completed sections auto-collapse, incomplete stay open
- Minimal required fields to create: name and project type only
- Projects start in "Draft" state after creation
- Manual save with unsaved changes warning on navigation
- Auto-save NOT enabled — explicit save only
- Templates supported: both system templates (NER, classification, etc.) and user-created templates
- Template application: copy all settings, user modifies what they need
- Project type changeable only in Draft, locked once activated
- Duplication options: Save as template, Full clone (with data sources), Clone without data
- Side panel combines checklist sidebar + summary showing key config at a glance
- Checklist shows completion status with missing requirements organized and linked to sections
- Success toast notification on save, redirect to project overview
- Basic keyboard shortcuts: Save (Cmd+S), Cancel (Esc), New project (Cmd+N)
- Field-level tooltips with info icons for complex fields

### Project Permissions
- Anyone can create a project
- Edit/delete: Creator, admins, and team leads of creator's team
- Projects can be transferred to another owner
- Soft delete, fully recoverable unless explicitly purged
- Purge: Admins and original creator can permanently delete

### Project Activation
- Strict validation required: output schema, at least one data source, skill requirements defined
- Validation errors shown in checklist sidebar with links to incomplete sections

### Project List View
- Table view only (no cards or kanban)
- Default view: All projects user has access to
- Toggles for: My Projects, All Projects, Team Projects
- Advanced sorting: name, date created, status, type, and more
- Advanced filtering: status, type, team, date range, skill requirements, creator, custom saved filters
- Full-text search: name, description, type, tags, and metadata
- Free-form tags with typeahead filtering existing tags
- Key metrics shown by default: task count, completion %, active annotators
- Configurable columns so users can customize display
- Full bulk actions (archive, delete, change status, assign team, export list) with permission controls
- Recent projects widget on user dashboard

### Project Overview Page
- Separate overview page from edit form
- Single scrollable page with clear sections (no tabs): Overview, Settings, Data Sources, Activity
- Recent activity (10-20 events) with link to full audit trail pre-filtered to project
- Rich documentation section with markdown support for guidelines, examples, FAQ
- Documentation visible to everyone who can see the project
- Documentation editable by project leads and above

### Schema Configuration
- JSON Schema editor with syntax highlighting for both input and output schemas
- Real-time validation as user types plus live preview of annotation form
- Input schema: JSON editor OR infer from sample data upload
- Schema inference: interactive resolution for ambiguous fields
- Full schema versioning: track changes, view history, revert to previous, track which tasks used which version
- Schema change handling: user chooses to apply to new tasks only or migrate existing
- Schema templates: system templates (NER, classification, etc.) plus user-saved templates
- Conditional fields supported: complex expressions with AND/OR, multiple conditions

### Data Source Setup
- Supported types: File upload, Cloud storage (S3, GCS, Azure Blob), External API connections
- Credentials: both direct credentials (stored encrypted) and IAM role assumption
- Ingestion: manual refresh (user triggers re-sync), not continuous
- Validation: user chooses per data source — strict (reject non-conforming) or lenient (flag for review)

### Project Lifecycle
- Statuses: Draft, Active, Paused, Completed, Archived
- Transitions by: project leads, creator's team leads, and admins
- Confirmation dialog for destructive transitions (archive, complete)
- Pause behavior: freeze in place — tasks stay assigned, partial work saved, submit disabled, annotators notified
- Completion: soft lock — admins can make corrections, annotators locked out
- Reopen: goes to Paused first, then manually activate
- Automation: configurable rules with default "auto-complete when 100% tasks done"
- Deadlines: optional target date with configurable actions (notify, auto-pause, escalate)

### Claude's Discretion
- Exact UI component library choices
- API response format details
- Database query optimization
- Error message wording
- Loading states and skeleton designs

</decisions>

<specifics>
## Specific Ideas

- Side panel should combine completion checklist AND project summary — single right-side panel for both
- Schema preview should show what the actual annotation form would look like as user edits
- Tag typeahead should filter existing tags as user types, but allow creating new ones
- Audit trail link from overview should pre-filter to current project automatically
- Documentation section should support markdown with guidelines, examples, and FAQ sections

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 05-project-management*
*Context gathered: 2026-01-28*
