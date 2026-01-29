//! Schema validation domain types
//!
//! Types for JSON Schema validation results and schema inference.

use serde::{Deserialize, Serialize};
use typeshare::typeshare;

/// A single validation error from JSON Schema validation
#[typeshare]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ValidationError {
    /// JSON Pointer path to the invalid field
    pub path: String,
    /// Human-readable error message
    pub message: String,
    /// JSON Schema keyword that failed (e.g., "required", "type", "minLength")
    pub keyword: Option<String>,
}

/// Result of validating data against a JSON Schema
#[typeshare]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ValidationResult {
    /// Whether the data is valid against the schema
    pub is_valid: bool,
    /// List of validation errors (empty if valid)
    pub errors: Vec<ValidationError>,
}

impl ValidationResult {
    /// Create a valid result
    pub fn valid() -> Self {
        Self {
            is_valid: true,
            errors: vec![],
        }
    }

    /// Create an invalid result with errors
    pub fn invalid(errors: Vec<ValidationError>) -> Self {
        Self {
            is_valid: false,
            errors,
        }
    }
}

/// An ambiguity discovered during schema inference
#[typeshare]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SchemaAmbiguity {
    /// JSON Pointer path to the ambiguous field
    pub path: String,
    /// Description of the ambiguity
    pub description: String,
    /// Possible type options
    pub options: Vec<String>,
    /// Suggested resolution
    pub suggested: String,
}

/// Result of inferring a JSON Schema from sample data
#[typeshare]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SchemaInferenceResult {
    /// The inferred JSON Schema
    pub schema: serde_json::Value,
    /// Ambiguities that need human review
    pub ambiguities: Vec<SchemaAmbiguity>,
}

impl SchemaInferenceResult {
    /// Create a result with no ambiguities
    pub fn clean(schema: serde_json::Value) -> Self {
        Self {
            schema,
            ambiguities: vec![],
        }
    }

    /// Create a result with ambiguities
    pub fn with_ambiguities(schema: serde_json::Value, ambiguities: Vec<SchemaAmbiguity>) -> Self {
        Self {
            schema,
            ambiguities,
        }
    }
}
