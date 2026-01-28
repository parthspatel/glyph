//! Glyph Plugins - Plugin runtime for WASM and JavaScript
//!
//! This crate provides plugin runtimes for extending Glyph:
//! - WASM plugins via wasmtime
//! - JavaScript plugins via Deno (future)

pub mod js;
pub mod wasm;

pub use js::*;
pub use wasm::*;
