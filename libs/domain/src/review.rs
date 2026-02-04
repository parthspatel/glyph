//! Review domain models.
//!
//! Reviews capture a reviewer's evaluation of an annotation,
//! including approve/reject decisions and inline comments.

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

use crate::ids::{AnnotationId, ReviewCommentId, ReviewId, TaskId, UserId};

/// Review action taken by a reviewer.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ReviewAction {
    Approve,
    Reject,
    RequestChanges,
}

/// Reviewer's evaluation of an annotation.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Review {
    pub review_id: ReviewId,
    pub annotation_id: AnnotationId,
    pub task_id: TaskId,
    pub reviewer_id: UserId,
    /// Action taken on the annotation
    pub action: ReviewAction,
    /// Corrected data if reviewer made edits
    pub corrected_data: Option<serde_json::Value>,
    /// Summary note for the annotation author
    pub summary_note: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

impl Review {
    /// Create a new review.
    pub fn new(
        annotation_id: AnnotationId,
        task_id: TaskId,
        reviewer_id: UserId,
        action: ReviewAction,
    ) -> Self {
        let now = Utc::now();
        Self {
            review_id: ReviewId::new(),
            annotation_id,
            task_id,
            reviewer_id,
            action,
            corrected_data: None,
            summary_note: None,
            created_at: now,
            updated_at: now,
        }
    }

    /// Create a review with corrected data.
    pub fn with_corrections(mut self, corrected_data: serde_json::Value) -> Self {
        self.corrected_data = Some(corrected_data);
        self
    }

    /// Create a review with a summary note.
    pub fn with_note(mut self, note: impl Into<String>) -> Self {
        self.summary_note = Some(note.into());
        self
    }
}

/// Inline comment attached to a specific part of an annotation.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ReviewComment {
    pub comment_id: ReviewCommentId,
    pub review_id: ReviewId,
    /// JSON path or field identifier for the commented content
    pub path: String,
    /// Comment content
    pub content: String,
    pub created_at: DateTime<Utc>,
}

impl ReviewComment {
    /// Create a new review comment.
    pub fn new(review_id: ReviewId, path: impl Into<String>, content: impl Into<String>) -> Self {
        Self {
            comment_id: ReviewCommentId::new(),
            review_id,
            path: path.into(),
            content: content.into(),
            created_at: Utc::now(),
        }
    }
}

/// Request to submit a review.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SubmitReviewRequest {
    pub annotation_id: AnnotationId,
    pub action: ReviewAction,
    pub corrected_data: Option<serde_json::Value>,
    pub summary_note: Option<String>,
}

/// Request to add a review comment.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AddCommentRequest {
    pub path: String,
    pub content: String,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_review_new() {
        let annotation_id = AnnotationId::new();
        let task_id = TaskId::new();
        let reviewer_id = UserId::new();

        let review = Review::new(annotation_id, task_id, reviewer_id, ReviewAction::Approve);

        assert_eq!(review.annotation_id, annotation_id);
        assert_eq!(review.task_id, task_id);
        assert_eq!(review.reviewer_id, reviewer_id);
        assert_eq!(review.action, ReviewAction::Approve);
        assert!(review.corrected_data.is_none());
        assert!(review.summary_note.is_none());
    }

    #[test]
    fn test_review_with_corrections() {
        let annotation_id = AnnotationId::new();
        let task_id = TaskId::new();
        let reviewer_id = UserId::new();
        let corrections = serde_json::json!({"field": "corrected"});

        let review = Review::new(
            annotation_id,
            task_id,
            reviewer_id,
            ReviewAction::RequestChanges,
        )
        .with_corrections(corrections.clone())
        .with_note("Please fix this");

        assert_eq!(review.corrected_data, Some(corrections));
        assert_eq!(review.summary_note, Some("Please fix this".to_string()));
    }

    #[test]
    fn test_review_comment() {
        let review_id = ReviewId::new();
        let comment = ReviewComment::new(review_id, "$.entities[0].label", "This should be PERSON");

        assert_eq!(comment.review_id, review_id);
        assert_eq!(comment.path, "$.entities[0].label");
        assert_eq!(comment.content, "This should be PERSON");
    }
}
