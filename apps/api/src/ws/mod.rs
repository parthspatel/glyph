//! WebSocket infrastructure for real-time updates
//!
//! Provides event types and a broadcast hub for pushing updates to connected clients.

pub mod events;
pub mod hub;

pub use events::{ClientMessage, QueueEvent};
pub use hub::QueueUpdateHub;
