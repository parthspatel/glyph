//! Glyph Server - Main entry point

use std::net::SocketAddr;
use std::sync::Arc;

use anyhow::Result;
use axum::{Extension, Router};
use sqlx::postgres::PgPoolOptions;
use tower_http::cors::CorsLayer;
use tower_http::trace::TraceLayer;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};
use utoipa::OpenApi;
use utoipa_swagger_ui::SwaggerUi;

use glyph_api::{
    extractors::{AuthState as ExtractorAuthState, DevMode},
    routes, ApiDoc,
};
use glyph_auth::{Auth0Client, Auth0Config, JwksCache};
use glyph_domain::UserId;

#[tokio::main]
async fn main() -> Result<()> {
    // Initialize tracing
    tracing_subscriber::registry()
        .with(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "glyph_api=debug,tower_http=debug,audit=info".into()),
        )
        .with(tracing_subscriber::fmt::layer())
        .init();

    // Load environment variables
    dotenvy::dotenv().ok();

    // Initialize database connection pool
    let database_url = std::env::var("DATABASE_URL")
        .unwrap_or_else(|_| "postgres://glyph:glyph@localhost:5432/glyph".to_string());

    let pool = PgPoolOptions::new()
        .max_connections(10)
        .connect(&database_url)
        .await?;

    tracing::info!("Connected to database");

    // Initialize authentication (optional - skip if Auth0 not configured)
    let auth_state = init_auth().await;

    // Build OpenAPI spec with route paths
    let mut openapi = ApiDoc::openapi();
    openapi.paths = routes::openapi_paths();

    // Build the application
    let mut app = Router::new()
        .merge(routes::api_routes())
        .merge(SwaggerUi::new("/swagger-ui").url("/api-docs/openapi.json", openapi))
        .layer(Extension(pool.clone()))
        .layer(TraceLayer::new_for_http())
        .layer(CorsLayer::permissive());

    // Add auth routes if configured
    if let Some(state) = auth_state {
        tracing::info!("Auth0 configured - enabling authentication routes");

        // Add AuthState as extension for CurrentUser extractor
        let extractor_state = ExtractorAuthState {
            jwks_cache: state.jwks_cache.clone(),
            auth0_config: state.auth0_config.clone(),
        };

        app = app
            .nest("/api/auth", routes::auth_routes(state))
            .layer(Extension(extractor_state));
    } else {
        tracing::warn!("Auth0 not configured - enabling development mode");
        tracing::warn!("Set AUTH0_DOMAIN, AUTH0_CLIENT_ID, AUTH0_CLIENT_SECRET, AUTH0_API_IDENTIFIER, AUTH0_CALLBACK_URL, AUTH0_LOGOUT_REDIRECT_URL to enable production auth");

        // Enable development mode with a mock user that exists in the database
        let dev_user_id = ensure_dev_user_exists(&pool).await?;
        let dev_mode = DevMode {
            mock_user_id: dev_user_id,
        };
        app = app.layer(Extension(dev_mode));
        tracing::info!("Development mode enabled - all requests use mock admin user");
    }

    // Start the server
    let addr = SocketAddr::from(([0, 0, 0, 0], 3000));
    tracing::info!("Starting Glyph server on {}", addr);
    tracing::info!("Swagger UI available at http://localhost:3000/swagger-ui/");

    let listener = tokio::net::TcpListener::bind(addr).await?;
    axum::serve(listener, app).await?;

    Ok(())
}

/// Ensure a dev user exists in the database for development mode.
/// Returns the user ID of the dev user.
async fn ensure_dev_user_exists(pool: &sqlx::PgPool) -> Result<UserId> {
    const DEV_USER_EMAIL: &str = "dev@localhost";

    // Check if dev user already exists
    let existing: Option<(String,)> =
        sqlx::query_as("SELECT user_id::text FROM users WHERE email = $1")
            .bind(DEV_USER_EMAIL)
            .fetch_optional(pool)
            .await?;

    if let Some((user_id_str,)) = existing {
        let user_id = user_id_str
            .parse::<UserId>()
            .map_err(|e| anyhow::anyhow!("Failed to parse dev user ID: {}", e))?;
        tracing::info!(user_id = %user_id, "Using existing dev user");
        return Ok(user_id);
    }

    // Create dev user
    let user_id = UserId::new();
    sqlx::query(
        r#"
        INSERT INTO users (user_id, email, display_name, auth0_id, global_role, status)
        VALUES ($1, $2, $3, $4, 'admin', 'active')
        "#,
    )
    .bind(user_id.as_uuid())
    .bind(DEV_USER_EMAIL)
    .bind("Development User")
    .bind("dev|mock-user")
    .execute(pool)
    .await?;

    tracing::info!(user_id = %user_id, "Created dev user");
    Ok(user_id)
}

/// Initialize authentication state from environment.
/// Returns None if Auth0 is not configured.
async fn init_auth() -> Option<routes::AuthState> {
    // Try to load Auth0 config
    let config = match Auth0Config::from_env() {
        Ok(c) => Arc::new(c),
        Err(e) => {
            tracing::debug!("Auth0 config not available: {}", e);
            return None;
        }
    };

    // Initialize JWKS cache
    let jwks_cache = Arc::new(JwksCache::new(config.jwks_url()));

    // Attempt initial JWKS fetch
    if let Err(e) = jwks_cache.refresh().await {
        tracing::warn!("Initial JWKS fetch failed (will retry on demand): {}", e);
    }

    // Initialize Auth0 client
    let auth0_client = match Auth0Client::new((*config).clone()).await {
        Ok(c) => Arc::new(c),
        Err(e) => {
            tracing::warn!("Failed to initialize Auth0 client: {}", e);
            return None;
        }
    };

    tracing::info!(domain = %config.domain, "Auth0 initialized");

    Some(routes::AuthState {
        jwks_cache,
        auth0_config: config,
        auth0_client,
    })
}
