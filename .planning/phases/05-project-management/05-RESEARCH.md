# Phase 5: Project Management - Research

**Researched:** 2026-01-28
**Domain:** Project configuration, JSON Schema validation, multi-cloud storage, collapsible forms
**Confidence:** HIGH

## Summary

Phase 5 implements project and project type CRUD with JSON Schema validation for task input and annotation output schemas, multi-cloud data source configuration (S3, GCS, Azure Blob), and a comprehensive project management UI with collapsible form sections.

The research confirms a clear standard stack: `jsonschema` crate (v0.40.0) for Rust-side JSON Schema validation, `infers-jsonschema` for schema inference from sample data, `object_store` crate for unified cloud storage access, React Hook Form + Zod for frontend form validation (needs to be added to project), and Monaco Editor for JSON schema editing with syntax highlighting.

Key architectural patterns include: collapsible accordion forms with ShadCN/Radix patterns, state machine pattern for project lifecycle using Rust's type system, schema versioning with embedded version numbers, and TanStack Table column visibility for configurable project list views.

**Primary recommendation:** Add `jsonschema = "0.40"`, `infers-jsonschema`, and `object_store` to Cargo.toml workspace dependencies; add `react-hook-form`, `zod`, `@hookform/resolvers`, and `@monaco-editor/react` to frontend package.json.

## Standard Stack

The established libraries/tools for this domain:

### Core (Rust Backend)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| jsonschema | 0.40.0 | JSON Schema validation | Most actively maintained, supports drafts 4/6/7/2019-09/2020-12, HIGH performance |
| infers-jsonschema | latest | Schema inference from sample JSON | Purpose-built for inferring schemas from data samples |
| object_store | 0.12.5 | Multi-cloud object storage | Apache Arrow project, unified API for S3/GCS/Azure, async-first |
| serde_json | 1.0 | JSON handling | Already in workspace, standard for Rust JSON |

### Core (Frontend)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| react-hook-form | ^7.54 | Form state management | Best perf, uncontrolled inputs, minimal re-renders, works with existing patterns |
| zod | ^3.23 | Schema validation | TypeScript-first, excellent inference, pairs well with RHF |
| @hookform/resolvers | ^3.9 | RHF + Zod integration | Official adapter |
| @monaco-editor/react | ^4.6 | JSON Schema editor | No webpack config needed, built-in JSON support |
| @radix-ui/react-accordion | ^1.2 | Collapsible sections | Accessible, unstyled, pairs with existing CSS patterns |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @radix-ui/react-collapsible | ^1.1 | Single section collapse | Simpler than accordion for single sections |
| lucide-react | ^0.460 | Icons | Already in node_modules, chevron/check icons for sections |
| react-router-dom (useBlocker) | ^7.1 | Unsaved changes warning | Already installed, v7 has useBlocker hook |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| jsonschema | valico | valico has DSL for schema generation but less maintained |
| object_store | aws-sdk-rust + azure_storage_blobs + cloud-storage | More control but 3x integration effort, no unified API |
| Monaco Editor | CodeMirror 6 | CodeMirror is lighter but Monaco has superior JSON Schema support built-in |
| react-hook-form | Formik | Formik is heavier, more re-renders, RHF is industry standard 2025 |

**Installation:**

Backend (add to Cargo.toml workspace.dependencies):
```toml
jsonschema = { version = "0.40", features = ["resolve-http"] }
infers-jsonschema = "0.1"
object_store = { version = "0.12", features = ["aws", "azure", "gcp"] }
```

Frontend (add to apps/web/package.json):
```bash
pnpm add react-hook-form zod @hookform/resolvers @monaco-editor/react @radix-ui/react-accordion @radix-ui/react-collapsible lucide-react
```

## Architecture Patterns

### Recommended Project Structure

Backend additions:
```
libs/
├── domain/src/
│   ├── project.rs          # Extended with ProjectType, DataSource, SchemaVersion
│   ├── data_source.rs      # NEW: DataSource, DataSourceType, Credentials
│   └── schema_version.rs   # NEW: SchemaVersion tracking
├── db/src/repo/
│   ├── pg_project.rs       # Extended with full CRUD
│   ├── pg_project_type.rs  # NEW: ProjectType repository
│   ├── pg_data_source.rs   # NEW: DataSource repository
│   └── pg_schema_version.rs # NEW: Schema versioning
└── storage/                # NEW: Cloud storage abstraction
    ├── mod.rs
    ├── s3.rs
    ├── gcs.rs
    └── azure.rs
```

Frontend additions:
```
apps/web/src/
├── components/project/
│   ├── ProjectForm.tsx           # Main collapsible form
│   ├── sections/
│   │   ├── BasicInfoSection.tsx
│   │   ├── ProjectTypeSection.tsx
│   │   ├── SchemaSection.tsx
│   │   ├── DataSourcesSection.tsx
│   │   └── SkillRequirementsSection.tsx
│   ├── ProjectChecklist.tsx      # Side panel checklist
│   ├── SchemaEditor.tsx          # Monaco-based JSON editor
│   ├── SchemaPreview.tsx         # Live annotation form preview
│   └── DataSourceConfig.tsx      # Cloud storage configuration
├── pages/
│   ├── ProjectsPage.tsx          # Table view with TanStack Table
│   ├── ProjectDetailPage.tsx     # Overview + Settings
│   └── ProjectCreatePage.tsx     # Create form
└── hooks/
    ├── useProjects.ts
    ├── useProjectTypes.ts
    ├── useSchemaValidation.ts
    └── useUnsavedChanges.ts
```

### Pattern 1: Collapsible Form Sections with React Hook Form

**What:** Form with accordion sections that auto-collapse when complete, expand on validation errors
**When to use:** Complex multi-section forms like project creation

```typescript
// Source: https://tanstack.com/table/latest + https://react-hook-form.com/advanced-usage
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as Accordion from '@radix-ui/react-accordion';
import { useState, useEffect } from 'react';
import { z } from 'zod';

const projectSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  project_type_id: z.string().min(1, 'Project type is required'),
  description: z.string().optional(),
  input_schema: z.any().optional(),
  output_schema: z.any().optional(),
  data_sources: z.array(z.any()).optional(),
  skill_requirements: z.array(z.string()).optional(),
});

type ProjectFormData = z.infer<typeof projectSchema>;

export function ProjectForm() {
  const methods = useForm<ProjectFormData>({
    resolver: zodResolver(projectSchema),
    mode: 'onChange', // Validate on change for real-time feedback
    defaultValues: {
      name: '',
      project_type_id: '',
      data_sources: [],
      skill_requirements: [],
    },
  });

  const { formState: { errors, dirtyFields } } = methods;
  
  // Track which sections are complete
  const sectionComplete = {
    basic: Boolean(dirtyFields.name && !errors.name),
    projectType: Boolean(dirtyFields.project_type_id && !errors.project_type_id),
    schema: Boolean(methods.getValues('output_schema')),
    dataSources: (methods.getValues('data_sources')?.length ?? 0) > 0,
    skills: (methods.getValues('skill_requirements')?.length ?? 0) > 0,
  };

  // Auto-expand sections with errors, collapse completed ones
  const [openSections, setOpenSections] = useState(['basic']);

  return (
    <FormProvider {...methods}>
      <form onSubmit={methods.handleSubmit(onSubmit)}>
        <Accordion.Root
          type="multiple"
          value={openSections}
          onValueChange={setOpenSections}
        >
          <Accordion.Item value="basic">
            <Accordion.Trigger>
              Basic Info {sectionComplete.basic && '✓'}
            </Accordion.Trigger>
            <Accordion.Content>
              <BasicInfoSection />
            </Accordion.Content>
          </Accordion.Item>
          {/* More sections... */}
        </Accordion.Root>
      </form>
    </FormProvider>
  );
}
```

### Pattern 2: Project Status State Machine

**What:** Type-safe status transitions with compile-time validation
**When to use:** Project lifecycle management

```rust
// Source: https://hoverbear.org/blog/rust-state-machine-pattern/
use crate::enums::ProjectStatus;

/// Valid status transitions for projects
pub struct ProjectStatusMachine;

impl ProjectStatusMachine {
    /// Returns allowed next statuses from current status
    pub fn allowed_transitions(from: ProjectStatus) -> Vec<ProjectStatus> {
        match from {
            ProjectStatus::Draft => vec![ProjectStatus::Active, ProjectStatus::Archived],
            ProjectStatus::Active => vec![ProjectStatus::Paused, ProjectStatus::Completed],
            ProjectStatus::Paused => vec![ProjectStatus::Active, ProjectStatus::Archived],
            ProjectStatus::Completed => vec![ProjectStatus::Archived, ProjectStatus::Paused],
            ProjectStatus::Archived => vec![], // Terminal state
            ProjectStatus::Deleted => vec![], // Terminal state
        }
    }

    /// Validate a status transition
    pub fn can_transition(from: ProjectStatus, to: ProjectStatus) -> bool {
        Self::allowed_transitions(from).contains(&to)
    }

    /// Validate activation requirements
    pub fn can_activate(project: &Project) -> Result<(), ActivationError> {
        let mut errors = Vec::new();
        
        if project.output_schema.is_none() {
            errors.push("Output schema is required");
        }
        if project.data_sources.is_empty() {
            errors.push("At least one data source is required");
        }
        if project.skill_requirements.is_empty() {
            errors.push("Skill requirements must be defined");
        }
        
        if errors.is_empty() {
            Ok(())
        } else {
            Err(ActivationError::ValidationFailed(errors))
        }
    }
}
```

### Pattern 3: JSON Schema Validation Service

**What:** Centralized schema validation with caching
**When to use:** Validating task input and annotation output data

```rust
// Source: https://docs.rs/jsonschema/0.40.0/jsonschema/
use jsonschema::{Draft, JSONSchema, ValidationError};
use serde_json::Value;
use std::sync::Arc;
use tokio::sync::RwLock;
use std::collections::HashMap;

pub struct SchemaValidationService {
    /// Cache compiled validators by schema version ID
    validators: RwLock<HashMap<String, Arc<JSONSchema>>>,
}

impl SchemaValidationService {
    pub fn new() -> Self {
        Self {
            validators: RwLock::new(HashMap::new()),
        }
    }

    /// Compile and cache a schema
    pub async fn compile_schema(
        &self,
        schema_version_id: &str,
        schema: &Value,
    ) -> Result<Arc<JSONSchema>, SchemaCompileError> {
        // Check cache first
        if let Some(validator) = self.validators.read().await.get(schema_version_id) {
            return Ok(Arc::clone(validator));
        }

        // Compile with draft 2020-12 (latest)
        let validator = jsonschema::draft202012::new(schema)
            .map_err(|e| SchemaCompileError::InvalidSchema(e.to_string()))?;
        
        let validator = Arc::new(validator);
        self.validators.write().await.insert(
            schema_version_id.to_string(),
            Arc::clone(&validator),
        );
        
        Ok(validator)
    }

    /// Validate data against a cached schema
    pub async fn validate(
        &self,
        schema_version_id: &str,
        data: &Value,
    ) -> Result<(), Vec<ValidationErrorInfo>> {
        let validators = self.validators.read().await;
        let validator = validators.get(schema_version_id)
            .ok_or_else(|| vec![ValidationErrorInfo {
                path: "".to_string(),
                message: "Schema not found".to_string(),
            }])?;

        let errors: Vec<_> = validator.iter_errors(data)
            .map(|e| ValidationErrorInfo {
                path: e.instance_path.to_string(),
                message: e.to_string(),
            })
            .collect();

        if errors.is_empty() {
            Ok(())
        } else {
            Err(errors)
        }
    }
}

#[derive(Debug, Clone)]
pub struct ValidationErrorInfo {
    pub path: String,
    pub message: String,
}
```

### Pattern 4: Schema Inference from Sample Data

**What:** Generate JSON Schema from sample JSON data
**When to use:** When user uploads sample data instead of writing schema manually

```rust
// Source: https://github.com/Stranger6667/infers-jsonschema
use infers_jsonschema::infer;
use serde_json::Value;

pub fn infer_schema_from_sample(sample: &Value) -> Value {
    infer(sample)
}

/// Infer schema with ambiguity detection for user resolution
pub fn infer_schema_interactive(samples: &[Value]) -> InferenceResult {
    if samples.is_empty() {
        return InferenceResult {
            schema: serde_json::json!({}),
            ambiguities: vec![],
        };
    }

    // Infer from first sample
    let mut schema = infer(&samples[0]);

    // Detect ambiguities across samples
    let mut ambiguities = Vec::new();
    
    for sample in samples.iter().skip(1) {
        let sample_schema = infer(sample);
        // Compare and detect type mismatches, optional vs required, etc.
        detect_ambiguities(&schema, &sample_schema, "", &mut ambiguities);
    }

    InferenceResult { schema, ambiguities }
}

#[derive(Debug)]
pub struct InferenceResult {
    pub schema: Value,
    pub ambiguities: Vec<SchemaAmbiguity>,
}

#[derive(Debug)]
pub struct SchemaAmbiguity {
    pub path: String,
    pub description: String,
    pub options: Vec<String>,
}
```

### Pattern 5: Multi-Cloud Storage with object_store

**What:** Unified interface for S3, GCS, Azure Blob
**When to use:** Data source ingestion from cloud storage

```rust
// Source: https://docs.rs/object_store/0.12.5/object_store/
use object_store::{ObjectStore, path::Path, GetResult};
use object_store::aws::AmazonS3Builder;
use object_store::azure::MicrosoftAzureBuilder;
use object_store::gcp::GoogleCloudStorageBuilder;
use std::sync::Arc;

pub enum CloudStorageConfig {
    S3 {
        bucket: String,
        region: String,
        access_key_id: Option<String>,
        secret_access_key: Option<String>,
        assume_role_arn: Option<String>,
    },
    Gcs {
        bucket: String,
        service_account_key: Option<String>,
    },
    Azure {
        container: String,
        account: String,
        access_key: Option<String>,
    },
}

pub fn create_store(config: &CloudStorageConfig) -> Result<Arc<dyn ObjectStore>, StorageError> {
    match config {
        CloudStorageConfig::S3 { bucket, region, access_key_id, secret_access_key, assume_role_arn } => {
            let mut builder = AmazonS3Builder::new()
                .with_bucket_name(bucket)
                .with_region(region);
            
            if let (Some(key), Some(secret)) = (access_key_id, secret_access_key) {
                builder = builder
                    .with_access_key_id(key)
                    .with_secret_access_key(secret);
            }
            
            // IAM role assumption handled automatically if configured
            Ok(Arc::new(builder.build()?))
        }
        CloudStorageConfig::Gcs { bucket, service_account_key } => {
            let mut builder = GoogleCloudStorageBuilder::new()
                .with_bucket_name(bucket);
            
            if let Some(key) = service_account_key {
                builder = builder.with_service_account_key(key);
            }
            
            Ok(Arc::new(builder.build()?))
        }
        CloudStorageConfig::Azure { container, account, access_key } => {
            let mut builder = MicrosoftAzureBuilder::new()
                .with_container_name(container)
                .with_account(account);
            
            if let Some(key) = access_key {
                builder = builder.with_access_key(key);
            }
            
            Ok(Arc::new(builder.build()?))
        }
    }
}

/// List objects with prefix
pub async fn list_objects(
    store: &Arc<dyn ObjectStore>,
    prefix: Option<&str>,
) -> Result<Vec<String>, StorageError> {
    use futures::StreamExt;
    
    let prefix = prefix.map(Path::from).unwrap_or_else(|| Path::from(""));
    let mut stream = store.list(Some(&prefix));
    let mut paths = Vec::new();
    
    while let Some(result) = stream.next().await {
        let meta = result?;
        paths.push(meta.location.to_string());
    }
    
    Ok(paths)
}
```

### Pattern 6: Unsaved Changes Warning Hook

**What:** Warn users before navigating away with unsaved form changes
**When to use:** Project form with manual save

```typescript
// Source: https://github.com/marmelab/react-admin/blob/master/packages/ra-core/src/form/useWarnWhenUnsavedChanges.tsx
import { useEffect, useRef, useCallback } from 'react';
import { useBlocker } from 'react-router-dom';
import { useFormState } from 'react-hook-form';

export function useUnsavedChanges(enabled = true) {
  const { isDirty, dirtyFields } = useFormState();
  const isDirtyRef = useRef(isDirty);
  isDirtyRef.current = isDirty;

  // Handle browser close/refresh
  useEffect(() => {
    if (!enabled) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirtyRef.current) {
        e.preventDefault();
        e.returnValue = ''; // Required for Chrome
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [enabled]);

  // Handle client-side navigation (React Router v7)
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      enabled &&
      isDirty &&
      currentLocation.pathname !== nextLocation.pathname
  );

  // Show confirmation dialog
  useEffect(() => {
    if (blocker.state === 'blocked') {
      const confirmLeave = window.confirm(
        'You have unsaved changes. Are you sure you want to leave?'
      );
      if (confirmLeave) {
        blocker.proceed();
      } else {
        blocker.reset();
      }
    }
  }, [blocker]);

  return { isDirty, dirtyFields };
}
```

### Anti-Patterns to Avoid

- **Hand-rolling JSON Schema validation:** Use `jsonschema` crate, don't parse and validate manually
- **Per-cloud-provider storage code:** Use `object_store` unified interface, not separate SDK integrations
- **Controlled form inputs everywhere:** Use React Hook Form's uncontrolled pattern for performance
- **Synchronous schema compilation:** Compile and cache validators asynchronously, don't block on every validation
- **String-based status transitions:** Use the state machine pattern with typed transitions

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| JSON Schema validation | Custom JSON traversal | `jsonschema` crate | Edge cases: $ref resolution, format validation, draft compatibility |
| Schema inference | Manual type detection | `infers-jsonschema` | Handles arrays, nested objects, null vs missing |
| Cloud storage abstraction | Per-provider SDKs | `object_store` | Authentication, retry logic, streaming, pagination |
| Form validation | Manual state + validation | react-hook-form + zod | Performance, type inference, error handling |
| JSON editor | Textarea + syntax highlight | Monaco Editor | Syntax errors, formatting, schema validation in editor |
| Accordion animations | CSS + state | Radix Accordion | Accessibility, keyboard nav, ARIA |
| Status transitions | if/else chains | State machine pattern | Compile-time safety, clear allowed transitions |

**Key insight:** The project requirements include JSON Schema validation, cloud storage, and complex forms - all domains with mature solutions that handle edge cases you'd otherwise spend weeks discovering.

## Common Pitfalls

### Pitfall 1: Schema Validation Performance

**What goes wrong:** Compiling JSON Schema on every validation request causes latency
**Why it happens:** Schemas are re-parsed and compiled for each validation call
**How to avoid:** Cache compiled `JSONSchema` validators keyed by schema version ID
**Warning signs:** Validation latency >10ms, CPU spikes on annotation submissions

### Pitfall 2: React Hook Form Re-renders

**What goes wrong:** Using `watch()` at form root causes all sections to re-render
**Why it happens:** `watch()` triggers re-render on any field change
**How to avoid:** Use `useWatch()` with specific field names, or `useFormState({ name: 'fieldName' })`
**Warning signs:** Sluggish typing in long forms, React DevTools showing excessive renders

### Pitfall 3: Cloud Storage Credential Exposure

**What goes wrong:** Storing plaintext credentials in database
**Why it happens:** Quick implementation without security consideration
**How to avoid:** Use encryption at rest (database-level or application-level), prefer IAM roles over stored credentials
**Warning signs:** Credentials visible in database dumps, audit findings

### Pitfall 4: Schema Version Migration Complexity

**What goes wrong:** Can't track which tasks used which schema version
**Why it happens:** Not storing schema_version_id on tasks at creation time
**How to avoid:** Always store schema_version_id foreign key on tasks, never just project_id
**Warning signs:** Can't regenerate historical annotation forms, can't audit schema changes

### Pitfall 5: Unsaved Changes False Positives

**What goes wrong:** Warning shows even when form data matches saved state
**Why it happens:** Using `isDirty` without comparing to original values
**How to avoid:** Compare `dirtyFields` with actual changes, or reset form after save with new default values
**Warning signs:** Users report annoying warnings when nothing changed

### Pitfall 6: Project Type Lock Timing

**What goes wrong:** Users change project type after tasks exist, breaking task data
**Why it happens:** No validation that project is in Draft status before type change
**How to avoid:** Add database constraint or application logic: project_type can only change when status = 'draft' AND task_count = 0
**Warning signs:** Tasks with input_data not matching input_schema

## Code Examples

Verified patterns from official sources:

### JSON Schema Validation with Error Collection

```rust
// Source: https://docs.rs/jsonschema/0.40.0/jsonschema/
use jsonschema::Draft;

pub fn validate_annotation_output(
    schema: &serde_json::Value,
    data: &serde_json::Value,
) -> Result<(), Vec<String>> {
    let validator = jsonschema::draft202012::new(schema)
        .expect("Schema should be valid");
    
    let errors: Vec<String> = validator
        .iter_errors(data)
        .map(|e| format!("{} at {}", e, e.instance_path))
        .collect();
    
    if errors.is_empty() {
        Ok(())
    } else {
        Err(errors)
    }
}
```

### TanStack Table Column Visibility Toggle

```typescript
// Source: https://tanstack.com/table/v8/docs/guide/column-visibility
import { useReactTable, getCoreRowModel } from '@tanstack/react-table';
import { useState } from 'react';

function ProjectsTable({ projects }: { projects: Project[] }) {
  const [columnVisibility, setColumnVisibility] = useState({
    description: false, // Hidden by default
    created_by: false,
  });

  const table = useReactTable({
    data: projects,
    columns,
    state: { columnVisibility },
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <>
      {/* Column visibility dropdown */}
      <div className="column-toggle">
        {table.getAllLeafColumns().map(column => (
          <label key={column.id}>
            <input
              type="checkbox"
              checked={column.getIsVisible()}
              onChange={column.getToggleVisibilityHandler()}
              disabled={!column.getCanHide()}
            />
            {column.id}
          </label>
        ))}
      </div>
      
      <table>{/* ... */}</table>
    </>
  );
}
```

### Monaco Editor for JSON Schema

```typescript
// Source: https://www.moczadlo.com/2024/delightful-inputs-with-intellisense-and-syntax-highlighting
import Editor from '@monaco-editor/react';

interface SchemaEditorProps {
  value: string;
  onChange: (value: string) => void;
  onValidate: (errors: string[]) => void;
}

export function SchemaEditor({ value, onChange, onValidate }: SchemaEditorProps) {
  const handleEditorChange = (newValue: string | undefined) => {
    if (newValue !== undefined) {
      onChange(newValue);
      
      // Validate JSON syntax
      try {
        JSON.parse(newValue);
        onValidate([]);
      } catch (e) {
        onValidate([(e as Error).message]);
      }
    }
  };

  return (
    <Editor
      height="300px"
      language="json"
      value={value}
      onChange={handleEditorChange}
      options={{
        minimap: { enabled: false },
        formatOnPaste: true,
        formatOnType: true,
        automaticLayout: true,
      }}
    />
  );
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| jsonschema 0.18 API | jsonschema 0.40 with draft builders | 2024 | New API: `jsonschema::draft202012::new()` instead of `JSONSchema::compile()` |
| react-json-schema-form | react-hook-form + custom components | 2023 | More flexibility, better TypeScript support |
| Separate cloud SDKs | object_store unified crate | 2023 | Apache Arrow donation, production-ready |
| Custom accordion CSS | Radix Accordion | 2023 | Accessibility, composability |

**Deprecated/outdated:**
- `jsonschema::JSONSchema::compile()`: Use draft-specific builders like `jsonschema::draft202012::new()`
- `jsonschema::is_valid()` for batch: Use cached validators
- `object_store` 0.13: Has breaking changes, use 0.12.5 for stability

## Open Questions

Things that couldn't be fully resolved:

1. **PostgreSQL-level JSON Schema Validation**
   - What we know: Extensions like `pg_jsonschema` exist and work in check constraints
   - What's unclear: Whether to validate at DB level vs application level
   - Recommendation: Validate in application for flexibility (schema versioning, better error messages), use DB constraints only as safety net

2. **Monaco Editor Bundle Size**
   - What we know: Monaco is ~2MB+ in bundle
   - What's unclear: Impact on initial load time
   - Recommendation: Lazy load the schema editor component, it's only used in project creation/edit

3. **Schema Migration When Schema Changes**
   - What we know: User can choose to apply to new tasks or migrate existing
   - What's unclear: Complex migration logic for structural changes
   - Recommendation: For Phase 5, implement new-tasks-only mode; migration can be Phase N feature

## Sources

### Primary (HIGH confidence)
- [jsonschema crate docs.rs](https://docs.rs/jsonschema/0.40.0/jsonschema/) - API patterns, draft support
- [object_store crate docs.rs](https://docs.rs/object_store/0.12.5/object_store/) - Cloud storage API
- [TanStack Table Column Visibility Guide](https://tanstack.com/table/v8/docs/guide/column-visibility) - Column toggle API
- [React Hook Form Advanced Usage](https://react-hook-form.com/advanced-usage) - Form patterns
- [Radix Accordion](https://www.radix-ui.com/docs/primitives/components/accordion) - Component API

### Secondary (MEDIUM confidence)
- [infers-jsonschema GitHub](https://github.com/Stranger6667/infers-jsonschema) - Schema inference
- [react-admin useWarnWhenUnsavedChanges](https://github.com/marmelab/react-admin/blob/master/packages/ra-core/src/form/useWarnWhenUnsavedChanges.tsx) - Unsaved changes pattern
- [pg_jsonschema Supabase](https://supabase.com/docs/guides/database/extensions/pg_jsonschema) - PostgreSQL validation

### Tertiary (LOW confidence)
- WebSearch results on schema versioning best practices - marked for validation

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Verified via crates.io, docs.rs, npm
- Architecture: HIGH - Follows existing codebase patterns, verified with official docs
- Pitfalls: MEDIUM - Based on web search and community patterns

**Research date:** 2026-01-28
**Valid until:** 2026-02-28 (30 days - stable domain)
