//! Telemetry and logging initialization

use tracing_subscriber::{fmt, layer::SubscriberExt, util::SubscriberInitExt, EnvFilter, Layer};

/// Initialize tracing/logging for the application.
///
/// Uses RUST_LOG env var for filtering.
/// Outputs JSON in production, pretty format in development.
pub fn init_tracing() {
    let env_filter = EnvFilter::try_from_default_env().unwrap_or_else(|_| EnvFilter::new("info"));

    let fmt_layer = if std::env::var("RUST_LOG_FORMAT").as_deref() == Ok("json") {
        fmt::layer()
            .json()
            .with_target(true)
            .with_file(true)
            .with_line_number(true)
            .boxed()
    } else {
        fmt::layer().pretty().with_target(true).boxed()
    };

    tracing_subscriber::registry()
        .with(env_filter)
        .with(fmt_layer)
        .init();
}
