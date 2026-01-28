//! Glyph Background Worker
//!
//! Processes async jobs: assignments, quality evaluation, exports, notifications.

use glyph_common::init_tracing;

#[tokio::main]
async fn main() {
    init_tracing();
    tracing::info!("Starting Glyph Worker...");

    // TODO: Initialize job processor
    // TODO: Connect to message queue
    // TODO: Start job loop

    tracing::info!("Worker started. Waiting for jobs...");

    // Keep running
    tokio::signal::ctrl_c()
        .await
        .expect("Failed to listen for ctrl-c");
    tracing::info!("Shutting down worker...");
}
