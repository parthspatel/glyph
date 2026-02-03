//! Goal tracking engine
//!
//! Tracks project goals (volume, quality, deadline, composite, manual)
//! with near real-time updates and configurable completion actions.

pub mod goal_evaluator;
pub mod tracker;

pub use goal_evaluator::*;
pub use tracker::*;
