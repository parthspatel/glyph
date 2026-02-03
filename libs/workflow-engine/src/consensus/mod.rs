//! Consensus algorithms for inter-annotator agreement
//!
//! Provides implementations of:
//! - Cohen's Kappa (2 annotators)
//! - Krippendorff's Alpha (multiple annotators, missing data)
//! - IoU (Intersection over Union) for spans and bounding boxes

pub mod alpha;
pub mod iou;
pub mod kappa;

pub use alpha::*;
pub use iou::*;
pub use kappa::*;

use thiserror::Error;

/// Errors that can occur during consensus calculation
#[derive(Debug, Error)]
pub enum ConsensusError {
    /// Input arrays have different lengths
    #[error("Length mismatch: expected {expected}, got {got}")]
    LengthMismatch { expected: usize, got: usize },

    /// Empty input provided
    #[error("Empty input: cannot compute consensus on empty data")]
    EmptyInput,

    /// Invalid category value
    #[error("Invalid category: {0}")]
    InvalidCategory(String),

    /// Computation error (e.g., division by zero)
    #[error("Computation error: {0}")]
    ComputationError(String),
}
