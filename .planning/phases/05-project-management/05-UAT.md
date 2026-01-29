---
status: diagnosed
phase: 05-project-management
source: 05-01-SUMMARY.md, 05-02-SUMMARY.md, 05-03-SUMMARY.md, 05-04-SUMMARY.md, 05-05-SUMMARY.md, 05-06-SUMMARY.md, 05-07-SUMMARY.md, 05-08-SUMMARY.md
started: 2026-01-29T00:15:00Z
updated: 2026-01-29T00:25:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Navigate to Projects List
expected: Navigate to /projects. The page loads showing a projects table with columns for name, status, and created date. If no projects exist, an empty state message is displayed.
result: issue
reported: "I'm able to nav to /projects. The layout is all messed up tho"
severity: major

### 2. Project Filters and Search
expected: The projects page shows a search input, status filter dropdown, and view toggle (My Projects/Team/All). Typing in search filters the list. Selecting a status filters by that status.
result: skipped
reason: No projects exist to test filtering

### 3. Navigate to Create Project
expected: Click "New Project" button on the projects list. Browser navigates to /projects/new. A form with collapsible accordion sections is displayed.
result: issue
reported: "I'm able to navigate there but i cant save a project. Failed to load resource: the server responded with a status of 404 (Not Found) http://localhost:5173/api/v1/projects/proj_019c08aa-02ce-7410-8b04-8124dab958a0"
severity: blocker

### 4. Project Form Basic Info Section
expected: The Basic Info section shows fields for Project Name (required), Description, and Project Type selection dropdown.
result: skipped
reason: Blocked by project save failure (Test 3)

### 5. Project Form Schema Section
expected: The Schemas section contains a Monaco editor for input/output JSON schemas. Schema templates dropdown offers presets (Classification, NER, Bounding Box).
result: skipped
reason: Blocked by project save failure (Test 3)

### 6. Project Form Data Sources Section
expected: The Data Sources section shows configuration for connecting external data (S3, GCS, Azure, API, File Upload). For a new unsaved project, it shows a message to save first.
result: skipped
reason: Blocked by project save failure (Test 3)

### 7. Project Form Validation
expected: Attempting to save with empty required fields shows validation errors. Project name is required. Form does not submit until validation passes.
result: skipped
reason: Blocked by project save failure (Test 3)

### 8. Save New Project
expected: Fill in required fields and click Save. Project is created and browser navigates to the project detail page or shows success message.
result: skipped
reason: Blocked by project save failure (Test 3)

### 9. Project Checklist Sidebar
expected: While editing a project, a sidebar checklist shows activation requirements (has project type, has schema, has data source). Items check off as they're configured.
result: skipped
reason: Blocked by project save failure (Test 3)

### 10. Unsaved Changes Warning
expected: Make changes to a form, then try to navigate away (close tab or use browser back). A warning dialog appears asking to confirm leaving with unsaved changes.
result: skipped
reason: Blocked by project save failure (Test 3)

### 11. Projects Table Sorting
expected: On the projects list, click column headers (Name, Status, Created) to sort the table by that column. Click again to reverse sort order.
result: skipped
reason: Blocked by project save failure (Test 3)

### 12. Projects Table Row Selection
expected: Checkboxes appear in the first column. Selecting rows enables bulk action buttons. A "select all" checkbox in the header selects all visible rows.
result: skipped
reason: Blocked by project save failure (Test 3)

### 13. Bulk Status Change
expected: Select multiple projects and use bulk actions to change their status. Selected projects update to the new status.
result: skipped
reason: Blocked by project save failure (Test 3)

## Summary

total: 13
passed: 0
issues: 2
pending: 0
skipped: 11

## Gaps

- truth: "Projects list page displays with proper layout"
  status: failed
  reason: "User reported: I'm able to nav to /projects. The layout is all messed up tho"
  severity: major
  test: 1
  root_cause: "CSS stylesheet (index.css) is missing style definitions for 50+ classes used by components (page-container, page-header, table-card, data-table, project-filters, etc.)"
  artifacts:
    - path: "apps/web/src/index.css"
      issue: "Only has 8 CSS selectors, missing all layout/component classes"
    - path: "apps/web/src/pages/ProjectsPage.tsx"
      issue: "Uses undefined classes: page-container, page-header, table-card, pagination, etc."
    - path: "apps/web/src/components/project/ProjectTable.tsx"
      issue: "Uses undefined classes: data-table, table-wrapper, empty-state, etc."
    - path: "apps/web/src/components/project/ProjectFilters.tsx"
      issue: "Uses undefined classes: project-filters, view-toggle, search-input, etc."
  missing:
    - "Add CSS definitions for page layout classes"
    - "Add CSS definitions for table styles"
    - "Add CSS definitions for filter components"
    - "Add CSS definitions for button variants and state styles"

- truth: "Project can be saved from /projects/new"
  status: failed
  reason: "User reported: Failed to load resource: the server responded with a status of 404 (Not Found) http://localhost:5173/api/v1/projects/proj_..."
  severity: blocker
  test: 3
  root_cause: "Backend project endpoints are stub implementations - create_project returns mock data without DB insert, get_project always returns 404"
  artifacts:
    - path: "apps/api/src/routes/projects.rs:217"
      issue: "get_project always returns Err(ApiError::not_found()) - never queries database"
    - path: "apps/api/src/routes/projects.rs:243-269"
      issue: "create_project generates mock response with ProjectId::new() but never inserts into database"
  missing:
    - "Implement PgProjectRepository with CRUD operations"
    - "Wire create_project to insert into database"
    - "Wire get_project to query database by ID"
    - "Wire list_projects to query database with filters"
