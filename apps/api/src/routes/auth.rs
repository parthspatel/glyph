//! Authentication routes.
//!
//! Handles OAuth2/OIDC flows with Auth0:
//! - Login initiation
//! - OAuth callback
//! - Logout
//! - Token refresh
//! - Current user info

use std::sync::Arc;

use axum::{
    extract::{Query, State},
    response::{IntoResponse, Redirect},
    routing::{get, post},
    Json, Router,
};
use axum_extra::extract::CookieJar;
use serde::{Deserialize, Serialize};
use tracing::{debug, info, warn};

use glyph_auth::{
    clear_auth_cookies, clear_pkce_cookie, cookie_time, parse_pkce_cookie, set_auth_cookies,
    set_pkce_cookie, Auth0Client, Auth0Config, Cookie, JwksCache, SameSite, PKCE_STATE_COOKIE,
};

use crate::extractors::CurrentUser;
use crate::ApiError;

/// Shared authentication state.
#[derive(Clone)]
pub struct AuthState {
    pub jwks_cache: Arc<JwksCache>,
    pub auth0_config: Arc<Auth0Config>,
    pub auth0_client: Arc<Auth0Client>,
}

/// Query parameters for login endpoint.
#[derive(Debug, Deserialize)]
pub struct LoginQuery {
    /// URL to redirect to after successful login
    redirect_to: Option<String>,
}

/// Query parameters for OAuth callback.
#[derive(Debug, Deserialize)]
pub struct CallbackQuery {
    /// Authorization code from Auth0
    code: String,
    /// CSRF state parameter
    state: String,
}

/// Response for /me endpoint.
#[derive(Debug, Serialize)]
pub struct MeResponse {
    pub auth0_id: String,
    pub email: Option<String>,
    pub email_verified: bool,
    pub name: Option<String>,
    pub roles: Vec<String>,
}

/// Build the auth router with AuthState.
pub fn routes() -> Router<AuthState> {
    Router::new()
        .route("/login", get(login))
        .route("/callback", get(callback))
        .route("/logout", post(logout))
        .route("/refresh", post(refresh))
        .route("/me", get(me))
}

/// Login endpoint - initiates OAuth flow.
///
/// GET /api/auth/login?redirect_to=/dashboard
///
/// Generates authorization URL and redirects to Auth0.
async fn login(
    State(auth): State<AuthState>,
    Query(query): Query<LoginQuery>,
    jar: CookieJar,
) -> impl IntoResponse {
    info!("initiating login flow");

    // Generate authorization URL with PKCE
    let auth_data = auth.auth0_client.authorize_url();

    // Store PKCE state in cookie
    let pkce_cookie = set_pkce_cookie(
        &auth_data.csrf_token,
        &auth_data.nonce,
        &auth_data.pkce_verifier,
    );

    // Store redirect_to if provided
    let redirect_cookie = query.redirect_to.map(|url| {
        Cookie::build(("glyph_redirect_to", url))
            .http_only(true)
            .secure(true)
            .same_site(SameSite::Lax)
            .max_age(cookie_time::Duration::minutes(10))
            .path("/api/auth")
            .build()
    });

    let mut updated_jar = jar.add(pkce_cookie);
    if let Some(cookie) = redirect_cookie {
        updated_jar = updated_jar.add(cookie);
    }

    debug!(url = %auth_data.url, "redirecting to Auth0");

    (updated_jar, Redirect::to(&auth_data.url))
}

/// OAuth callback endpoint.
///
/// GET /api/auth/callback?code=xxx&state=xxx
///
/// Exchanges authorization code for tokens and sets cookies.
async fn callback(
    State(auth): State<AuthState>,
    Query(query): Query<CallbackQuery>,
    jar: CookieJar,
) -> Result<impl IntoResponse, ApiError> {
    info!("processing OAuth callback");

    // Get PKCE state from cookie
    let pkce_cookie = jar.get(PKCE_STATE_COOKIE).ok_or_else(|| {
        warn!("PKCE cookie missing");
        ApiError::bad_request("auth.invalid_state", "Missing PKCE state")
    })?;

    let (csrf_token, nonce, pkce_verifier) =
        parse_pkce_cookie(pkce_cookie.value()).ok_or_else(|| {
            warn!("PKCE cookie malformed");
            ApiError::bad_request("auth.invalid_state", "Invalid PKCE state")
        })?;

    // Verify CSRF state
    if query.state != csrf_token {
        warn!(expected = %csrf_token, got = %query.state, "CSRF state mismatch");
        return Err(ApiError::bad_request(
            "auth.invalid_state",
            "State mismatch",
        ));
    }

    // Exchange code for tokens
    let tokens = auth
        .auth0_client
        .exchange_code(&query.code, &pkce_verifier, &nonce)
        .await
        .map_err(|e| {
            warn!(error = %e, "token exchange failed");
            ApiError::bad_request("auth.token_exchange_failed", "Failed to exchange code")
        })?;

    info!("token exchange successful");

    // Get redirect URL from cookie BEFORE consuming jar (or default to /)
    let redirect_to = jar
        .get("glyph_redirect_to")
        .map(|c| c.value().to_string())
        .unwrap_or_else(|| "/".to_string());

    // Set auth cookies
    let (access_cookie, refresh_cookie) =
        set_auth_cookies(tokens.access_token, tokens.refresh_token);

    let mut updated_jar = jar.add(access_cookie).add(clear_pkce_cookie());

    if let Some(cookie) = refresh_cookie {
        updated_jar = updated_jar.add(cookie);
    }

    // Clear redirect cookie
    let clear_redirect = Cookie::build(("glyph_redirect_to", ""))
        .max_age(cookie_time::Duration::ZERO)
        .path("/api/auth")
        .build();
    updated_jar = updated_jar.add(clear_redirect);

    Ok((updated_jar, Redirect::to(&redirect_to)))
}

/// Logout endpoint.
///
/// POST /api/auth/logout
///
/// Clears cookies and returns Auth0 logout URL.
async fn logout(State(auth): State<AuthState>, jar: CookieJar) -> impl IntoResponse {
    info!("processing logout");

    // Clear auth cookies
    let (access_cookie, refresh_cookie) = clear_auth_cookies();

    let updated_jar = jar.add(access_cookie).add(refresh_cookie);

    // Generate federated logout URL
    let logout_url = auth
        .auth0_client
        .logout_url(&auth.auth0_config.logout_redirect_url);

    #[derive(Serialize)]
    struct LogoutResponse {
        logout_url: String,
    }

    (updated_jar, Json(LogoutResponse { logout_url }))
}

/// Token refresh endpoint.
///
/// POST /api/auth/refresh
///
/// Refreshes access token using refresh token cookie.
async fn refresh(
    State(auth): State<AuthState>,
    jar: CookieJar,
) -> Result<impl IntoResponse, ApiError> {
    debug!("processing token refresh");

    // Get refresh token from cookie (only sent to this path)
    let refresh_token = jar
        .get(glyph_auth::REFRESH_TOKEN_COOKIE)
        .ok_or(ApiError::Unauthorized)?
        .value()
        .to_string();

    // Refresh tokens
    let tokens = auth
        .auth0_client
        .refresh_tokens(&refresh_token)
        .await
        .map_err(|e| {
            warn!(error = %e, "token refresh failed");
            ApiError::Unauthorized
        })?;

    info!("token refresh successful");

    // Set new auth cookies
    let (access_cookie, refresh_cookie) =
        set_auth_cookies(tokens.access_token, tokens.refresh_token);

    let mut updated_jar = jar.add(access_cookie);
    if let Some(cookie) = refresh_cookie {
        updated_jar = updated_jar.add(cookie);
    }

    Ok((updated_jar, Json(serde_json::json!({"status": "ok"}))))
}

/// Current user info endpoint.
///
/// GET /api/auth/me
///
/// Returns authenticated user's info.
async fn me(user: CurrentUser) -> Json<MeResponse> {
    Json(MeResponse {
        auth0_id: user.auth0_id,
        email: user.email,
        email_verified: user.email_verified,
        name: user.name,
        roles: user.roles,
    })
}
