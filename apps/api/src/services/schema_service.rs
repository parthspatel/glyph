//! JSON Schema validation service
//!
//! Provides centralized schema compilation, caching, and validation
//! for task input and annotation output data.

use std::collections::HashMap;
use std::hash::{Hash, Hasher};
use std::sync::Arc;

use jsonschema::Validator;
use thiserror::Error;
use tokio::sync::RwLock;

use glyph_domain::{SchemaAmbiguity, SchemaInferenceResult, ValidationError, ValidationResult};

/// Errors that can occur during schema operations
#[derive(Debug, Error)]
pub enum SchemaError {
    #[error("invalid schema: {0}")]
    InvalidSchema(String),
    #[error("validation failed")]
    ValidationFailed,
}

/// Service for validating data against JSON Schemas.
///
/// Compiles and caches validators for performance. Thread-safe for concurrent use.
pub struct SchemaValidationService {
    /// Cache of compiled validators keyed by schema hash
    validators: RwLock<HashMap<u64, Arc<Validator>>>,
}

impl SchemaValidationService {
    /// Create a new schema validation service
    pub fn new() -> Self {
        Self {
            validators: RwLock::new(HashMap::new()),
        }
    }

    /// Compile a JSON Schema and cache the validator.
    ///
    /// Returns a cached validator if one exists for this schema.
    pub async fn compile(&self, schema: &serde_json::Value) -> Result<Arc<Validator>, SchemaError> {
        let hash = self.hash_schema(schema);

        // Check cache first
        {
            let cache = self.validators.read().await;
            if let Some(validator) = cache.get(&hash) {
                return Ok(Arc::clone(validator));
            }
        }

        // Compile the schema
        let validator = jsonschema::validator_for(schema)
            .map_err(|e| SchemaError::InvalidSchema(e.to_string()))?;

        let validator = Arc::new(validator);

        // Cache it
        {
            let mut cache = self.validators.write().await;
            cache.insert(hash, Arc::clone(&validator));
        }

        Ok(validator)
    }

    /// Validate data against a JSON Schema.
    ///
    /// Returns a ValidationResult with detailed error information.
    pub async fn validate(
        &self,
        schema: &serde_json::Value,
        data: &serde_json::Value,
    ) -> Result<ValidationResult, SchemaError> {
        let validator = self.compile(schema).await?;

        let errors: Vec<ValidationError> = validator
            .iter_errors(data)
            .map(|e| ValidationError {
                path: e.instance_path.to_string(),
                message: e.to_string(),
                keyword: Some(format!("{:?}", e.kind)),
            })
            .collect();

        Ok(ValidationResult {
            is_valid: errors.is_empty(),
            errors,
        })
    }

    /// Check if data is valid against a schema (simple boolean check).
    pub async fn is_valid(
        &self,
        schema: &serde_json::Value,
        data: &serde_json::Value,
    ) -> Result<bool, SchemaError> {
        let validator = self.compile(schema).await?;
        Ok(validator.is_valid(data))
    }

    /// Infer a JSON Schema from sample data.
    ///
    /// Analyzes the structure of sample JSON values and generates
    /// a schema that would validate them. Reports ambiguities when
    /// types differ across samples.
    pub fn infer_schema(&self, samples: &[serde_json::Value]) -> SchemaInferenceResult {
        if samples.is_empty() {
            return SchemaInferenceResult::clean(serde_json::json!({
                "$schema": "https://json-schema.org/draft/2020-12/schema",
                "type": "object"
            }));
        }

        let mut ambiguities = Vec::new();
        let schema = self.infer_from_values(samples, "", &mut ambiguities);

        SchemaInferenceResult {
            schema: serde_json::json!({
                "$schema": "https://json-schema.org/draft/2020-12/schema",
                "type": schema.get("type").cloned().unwrap_or(serde_json::json!("object")),
                "properties": schema.get("properties").cloned(),
                "required": schema.get("required").cloned(),
                "items": schema.get("items").cloned(),
            }),
            ambiguities,
        }
    }

    /// Clear the validator cache
    pub async fn clear_cache(&self) {
        let mut cache = self.validators.write().await;
        cache.clear();
    }

    /// Get the number of cached validators
    pub async fn cache_size(&self) -> usize {
        let cache = self.validators.read().await;
        cache.len()
    }

    // =========================================================================
    // Private helpers
    // =========================================================================

    fn hash_schema(&self, schema: &serde_json::Value) -> u64 {
        let mut hasher = std::collections::hash_map::DefaultHasher::new();
        schema.to_string().hash(&mut hasher);
        hasher.finish()
    }

    fn infer_from_values(
        &self,
        samples: &[serde_json::Value],
        path: &str,
        ambiguities: &mut Vec<SchemaAmbiguity>,
    ) -> serde_json::Value {
        let types: Vec<&str> = samples.iter().map(|v| json_type(v)).collect();
        let unique_types: Vec<&str> = types
            .iter()
            .copied()
            .collect::<std::collections::HashSet<_>>()
            .into_iter()
            .collect();

        // Check for type ambiguity
        if unique_types.len() > 1 {
            let has_null = unique_types.contains(&"null");
            let non_null_types: Vec<&&str> =
                unique_types.iter().filter(|t| **t != "null").collect();

            if non_null_types.len() > 1 {
                ambiguities.push(SchemaAmbiguity {
                    path: if path.is_empty() {
                        "/".to_string()
                    } else {
                        path.to_string()
                    },
                    description: format!(
                        "Field has multiple types: {}",
                        non_null_types
                            .iter()
                            .map(|t| t.to_string())
                            .collect::<Vec<_>>()
                            .join(", ")
                    ),
                    options: non_null_types.iter().map(|t| t.to_string()).collect(),
                    suggested: non_null_types
                        .first()
                        .map(|t| t.to_string())
                        .unwrap_or_default(),
                });
            }

            // If there's a null, the field is optional
            if has_null && non_null_types.len() == 1 {
                return serde_json::json!({
                    "type": [non_null_types[0], "null"]
                });
            }
        }

        let primary_type = unique_types.first().unwrap_or(&"object");

        match *primary_type {
            "object" => {
                let objects: Vec<&serde_json::Map<String, serde_json::Value>> =
                    samples.iter().filter_map(|v| v.as_object()).collect();

                if objects.is_empty() {
                    return serde_json::json!({"type": "object"});
                }

                // Collect all keys
                let all_keys: std::collections::HashSet<&str> = objects
                    .iter()
                    .flat_map(|o| o.keys().map(|k| k.as_str()))
                    .collect();

                // Determine required keys (present in all samples)
                let required: Vec<String> = all_keys
                    .iter()
                    .filter(|k| objects.iter().all(|o| o.contains_key(**k)))
                    .map(|k| k.to_string())
                    .collect();

                // Build properties schema
                let mut properties = serde_json::Map::new();
                for key in all_keys {
                    let values: Vec<serde_json::Value> =
                        objects.iter().filter_map(|o| o.get(key).cloned()).collect();
                    let child_path = if path.is_empty() {
                        format!("/{}", key)
                    } else {
                        format!("{}/{}", path, key)
                    };
                    properties.insert(
                        key.to_string(),
                        self.infer_from_values(&values, &child_path, ambiguities),
                    );
                }

                serde_json::json!({
                    "type": "object",
                    "properties": properties,
                    "required": required
                })
            }
            "array" => {
                let arrays: Vec<&Vec<serde_json::Value>> =
                    samples.iter().filter_map(|v| v.as_array()).collect();

                let all_items: Vec<serde_json::Value> =
                    arrays.into_iter().flatten().cloned().collect();

                if all_items.is_empty() {
                    return serde_json::json!({"type": "array"});
                }

                let item_path = format!("{}[]", path);
                let items_schema = self.infer_from_values(&all_items, &item_path, ambiguities);

                serde_json::json!({
                    "type": "array",
                    "items": items_schema
                })
            }
            "string" => serde_json::json!({"type": "string"}),
            "number" => serde_json::json!({"type": "number"}),
            "integer" => serde_json::json!({"type": "integer"}),
            "boolean" => serde_json::json!({"type": "boolean"}),
            "null" => serde_json::json!({"type": "null"}),
            _ => serde_json::json!({}),
        }
    }
}

impl Default for SchemaValidationService {
    fn default() -> Self {
        Self::new()
    }
}

/// Get the JSON type name for a value
fn json_type(value: &serde_json::Value) -> &'static str {
    match value {
        serde_json::Value::Null => "null",
        serde_json::Value::Bool(_) => "boolean",
        serde_json::Value::Number(n) => {
            if n.is_i64() || n.is_u64() {
                "integer"
            } else {
                "number"
            }
        }
        serde_json::Value::String(_) => "string",
        serde_json::Value::Array(_) => "array",
        serde_json::Value::Object(_) => "object",
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_validate_valid_data() {
        let service = SchemaValidationService::new();
        let schema = serde_json::json!({
            "type": "object",
            "properties": {
                "name": {"type": "string"},
                "age": {"type": "integer"}
            },
            "required": ["name"]
        });
        let data = serde_json::json!({
            "name": "John",
            "age": 30
        });

        let result = service.validate(&schema, &data).await.unwrap();
        assert!(result.is_valid);
        assert!(result.errors.is_empty());
    }

    #[tokio::test]
    async fn test_validate_invalid_data() {
        let service = SchemaValidationService::new();
        let schema = serde_json::json!({
            "type": "object",
            "properties": {
                "name": {"type": "string"}
            },
            "required": ["name"]
        });
        let data = serde_json::json!({
            "age": 30
        });

        let result = service.validate(&schema, &data).await.unwrap();
        assert!(!result.is_valid);
        assert!(!result.errors.is_empty());
    }

    #[tokio::test]
    async fn test_schema_caching() {
        let service = SchemaValidationService::new();
        let schema = serde_json::json!({"type": "string"});

        // First call compiles
        service.compile(&schema).await.unwrap();
        assert_eq!(service.cache_size().await, 1);

        // Second call uses cache
        service.compile(&schema).await.unwrap();
        assert_eq!(service.cache_size().await, 1);
    }

    #[test]
    fn test_infer_schema_simple_object() {
        let service = SchemaValidationService::new();
        let samples = vec![
            serde_json::json!({"name": "John", "age": 30}),
            serde_json::json!({"name": "Jane", "age": 25}),
        ];

        let result = service.infer_schema(&samples);
        assert!(result.ambiguities.is_empty());

        let props = result.schema.get("properties").unwrap();
        assert!(props.get("name").is_some());
        assert!(props.get("age").is_some());
    }
}
