//! Quality evaluation service

use async_trait::async_trait;
use glyph_domain::{Annotation, QualityEntityType, QualityScore};
use thiserror::Error;
use uuid::Uuid;

#[derive(Debug, Error)]
pub enum QualityError {
    #[error("Evaluator {0} not found")]
    EvaluatorNotFound(String),

    #[error("Cannot evaluate entity {0}: {1}")]
    EvaluationFailed(Uuid, String),

    #[error("Insufficient data for evaluation")]
    InsufficientData,

    #[error("Database error: {0}")]
    DatabaseError(String),
}

/// Service for quality evaluation and scoring
#[async_trait]
pub trait QualityService: Send + Sync {
    /// Evaluate the quality of an annotation
    async fn evaluate_annotation(
        &self,
        annotation: &Annotation,
        evaluator_id: &str,
    ) -> Result<QualityScore, QualityError>;

    /// Calculate inter-annotator agreement for a task
    async fn calculate_agreement(&self, task_id: Uuid, step_id: &str) -> Result<f64, QualityError>;

    /// Get quality scores for an entity
    async fn get_scores(
        &self,
        entity_type: QualityEntityType,
        entity_id: Uuid,
    ) -> Result<Vec<QualityScore>, QualityError>;

    /// Update user quality profile based on recent annotations
    async fn update_user_profile(&self, user_id: Uuid) -> Result<(), QualityError>;
}
