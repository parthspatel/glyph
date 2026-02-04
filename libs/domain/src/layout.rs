//! Layout domain types.
//!
//! Layouts define how annotation tasks are presented to annotators.
//! Each layout has versions that follow a draft -> published -> deprecated lifecycle.

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

use crate::ids::{LayoutId, LayoutVersionId, ProjectTypeId, UserId};

/// Layout status lifecycle.
///
/// - Draft: Can be edited, not used in production
/// - Published: Immutable, active for new tasks
/// - Deprecated: Immutable, not used for new tasks but existing tasks keep it
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum LayoutStatus {
    Draft,
    Published,
    Deprecated,
}

/// Template format for layouts.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum TemplateFormat {
    Nunjucks,
    Mdx,
    Tsx,
}

impl Default for TemplateFormat {
    fn default() -> Self {
        Self::Nunjucks
    }
}

/// Layout settings per PRD §5.2.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LayoutSettings {
    /// Auto-save annotation progress
    pub auto_save: bool,
    /// Auto-save interval in milliseconds
    pub auto_save_interval: u32,
    /// Show progress indicator
    pub show_progress: bool,
    /// Enable keyboard shortcuts
    pub keyboard_shortcuts: bool,
    /// Require confirmation before submit
    pub confirm_submit: bool,
    /// Allow skip button
    pub allow_skip: bool,
    /// Custom CSS for the layout
    pub custom_css: Option<String>,
}

impl Default for LayoutSettings {
    fn default() -> Self {
        Self {
            auto_save: true,
            auto_save_interval: 5000,
            show_progress: true,
            keyboard_shortcuts: true,
            confirm_submit: true,
            allow_skip: true,
            custom_css: None,
        }
    }
}

/// A layout template (header entity, multiple versions).
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Layout {
    pub id: LayoutId,
    pub name: String,
    pub description: Option<String>,
    pub project_type_id: Option<ProjectTypeId>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

/// A specific version of a layout (immutable once published).
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LayoutVersion {
    pub id: LayoutVersionId,
    pub layout_id: LayoutId,
    /// Semantic version string (e.g., "1.0.0")
    pub version: String,
    pub status: LayoutStatus,
    pub template_format: TemplateFormat,
    /// Template content (Nunjucks, MDX, or TSX)
    pub content: String,
    /// JSON Schema for input data validation
    pub input_schema: Option<serde_json::Value>,
    /// JSON Schema for output data validation
    pub output_schema: Option<serde_json::Value>,
    pub settings: LayoutSettings,
    /// Allowlist of component names that can be used
    pub allowed_components: Vec<String>,
    /// Keyboard shortcut definitions
    pub shortcuts: serde_json::Value,
    pub created_at: DateTime<Utc>,
    pub published_at: Option<DateTime<Utc>>,
    pub deprecated_at: Option<DateTime<Utc>>,
    pub created_by: UserId,
}

impl LayoutVersion {
    /// Check if this version can be edited (only drafts).
    #[must_use]
    pub fn can_edit(&self) -> bool {
        self.status == LayoutStatus::Draft
    }

    /// Check if this version can be published.
    #[must_use]
    pub fn can_publish(&self) -> bool {
        self.status == LayoutStatus::Draft
    }

    /// Check if this version can be deprecated.
    #[must_use]
    pub fn can_deprecate(&self) -> bool {
        self.status == LayoutStatus::Published
    }
}

/// Request to create a new layout.
#[derive(Debug, Deserialize)]
pub struct CreateLayoutRequest {
    pub name: String,
    pub description: Option<String>,
    pub project_type_id: Option<ProjectTypeId>,
}

/// Request to create a new layout version.
#[derive(Debug, Deserialize)]
pub struct CreateLayoutVersionRequest {
    pub layout_id: LayoutId,
    pub version: String,
    #[serde(default)]
    pub template_format: TemplateFormat,
    pub content: String,
    pub input_schema: Option<serde_json::Value>,
    pub output_schema: Option<serde_json::Value>,
    pub settings: Option<LayoutSettings>,
    pub allowed_components: Option<Vec<String>>,
    pub shortcuts: Option<serde_json::Value>,
}

/// Request to update a draft version.
#[derive(Debug, Deserialize)]
pub struct UpdateLayoutVersionRequest {
    pub content: Option<String>,
    pub input_schema: Option<serde_json::Value>,
    pub output_schema: Option<serde_json::Value>,
    pub settings: Option<LayoutSettings>,
    pub allowed_components: Option<Vec<String>>,
    pub shortcuts: Option<serde_json::Value>,
}
