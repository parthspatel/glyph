//! Data Source domain models
//!
//! Data sources define where task data comes from - file uploads,
//! cloud storage (S3, GCS, Azure), or external APIs.

use std::collections::HashMap;

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use typeshare::typeshare;

use crate::ids::{DataSourceId, ProjectId};

/// Type of data source
#[typeshare]
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum DataSourceType {
    FileUpload,
    S3,
    Gcs,
    AzureBlob,
    Api,
}

impl DataSourceType {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::FileUpload => "file_upload",
            Self::S3 => "s3",
            Self::Gcs => "gcs",
            Self::AzureBlob => "azure_blob",
            Self::Api => "api",
        }
    }

    pub fn from_str(s: &str) -> Option<Self> {
        match s {
            "file_upload" => Some(Self::FileUpload),
            "s3" => Some(Self::S3),
            "gcs" => Some(Self::Gcs),
            "azure_blob" => Some(Self::AzureBlob),
            "api" => Some(Self::Api),
            _ => None,
        }
    }
}

/// Validation mode for data source items
#[typeshare]
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize, Default)]
#[serde(rename_all = "snake_case")]
pub enum ValidationMode {
    /// Strict: Reject items that don't match schema
    #[default]
    Strict,
    /// Lenient: Allow items with extra fields, coerce types
    Lenient,
}

impl ValidationMode {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Strict => "strict",
            Self::Lenient => "lenient",
        }
    }

    pub fn from_str(s: &str) -> Option<Self> {
        match s {
            "strict" => Some(Self::Strict),
            "lenient" => Some(Self::Lenient),
            _ => None,
        }
    }
}

/// Configuration specific to data source type
#[typeshare]
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum DataSourceConfig {
    /// File upload configuration
    FileUpload {
        allowed_extensions: Vec<String>,
        max_file_size_mb: i32,
    },
    /// AWS S3 configuration
    S3 {
        bucket: String,
        region: String,
        prefix: Option<String>,
        use_iam_role: bool,
    },
    /// Google Cloud Storage configuration
    Gcs {
        bucket: String,
        prefix: Option<String>,
        use_workload_identity: bool,
    },
    /// Azure Blob Storage configuration
    AzureBlob {
        container: String,
        account: String,
        prefix: Option<String>,
        use_managed_identity: bool,
    },
    /// External API configuration
    Api {
        endpoint: String,
        auth_type: ApiAuthType,
        headers: HashMap<String, String>,
        polling_interval_seconds: Option<i32>,
    },
}

impl Default for DataSourceConfig {
    fn default() -> Self {
        Self::FileUpload {
            allowed_extensions: vec!["json".to_string(), "jsonl".to_string(), "csv".to_string()],
            max_file_size_mb: 100,
        }
    }
}

/// Authentication type for API data sources
#[typeshare]
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum ApiAuthType {
    None,
    ApiKey { header_name: String },
    Bearer,
    Basic,
}

impl Default for ApiAuthType {
    fn default() -> Self {
        Self::None
    }
}

/// A data source for a project
#[typeshare]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DataSource {
    pub data_source_id: DataSourceId,
    pub project_id: ProjectId,
    pub name: String,
    pub source_type: DataSourceType,
    pub config: DataSourceConfig,
    pub validation_mode: ValidationMode,
    pub last_sync_at: Option<DateTime<Utc>>,
    pub item_count: i32,
    pub error_count: i32,
    pub is_active: bool,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

/// DTO for creating a new data source
#[typeshare]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateDataSource {
    pub name: String,
    pub source_type: DataSourceType,
    pub config: DataSourceConfig,
    pub validation_mode: Option<ValidationMode>,
}

/// DTO for updating a data source
#[typeshare]
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct UpdateDataSource {
    pub name: Option<String>,
    pub config: Option<DataSourceConfig>,
    pub validation_mode: Option<ValidationMode>,
    pub is_active: Option<bool>,
}

/// Filter for listing data sources
#[derive(Debug, Clone, Default)]
pub struct DataSourceFilter {
    pub project_id: Option<ProjectId>,
    pub source_type: Option<DataSourceType>,
    pub is_active: Option<bool>,
}

/// Result of testing a data source connection
#[typeshare]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConnectionTestResult {
    pub success: bool,
    pub message: String,
    pub latency_ms: Option<i64>,
    pub sample_files: Option<Vec<String>>,
}

/// File information from a data source
#[typeshare]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DataSourceFile {
    pub path: String,
    pub size_bytes: u64,
    pub modified_at: Option<DateTime<Utc>>,
    pub content_type: Option<String>,
}
