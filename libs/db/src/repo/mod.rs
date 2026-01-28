//! Repository module
//!
//! Contains repository traits and error types.
//! PostgreSQL implementations will be added in Phase 2 Plan 05.

pub mod errors;
pub mod traits;

pub use errors::*;
pub use traits::*;
