//! Token cookie helpers for secure storage.
//!
//! Provides constants and helper functions for managing authentication
//! tokens in HttpOnly cookies with proper security settings.

use chrono::Duration;
use cookie::{Cookie, SameSite};

/// Cookie name for access tokens.
pub const ACCESS_TOKEN_COOKIE: &str = "glyph_access_token";

/// Cookie name for refresh tokens.
pub const REFRESH_TOKEN_COOKIE: &str = "glyph_refresh_token";

/// Cookie name for PKCE state during OAuth flow.
pub const PKCE_STATE_COOKIE: &str = "glyph_pkce_state";

/// Access token validity duration (30 minutes).
pub const ACCESS_TOKEN_DURATION: Duration = Duration::minutes(30);

/// Refresh token validity duration (7 days).
pub const REFRESH_TOKEN_DURATION: Duration = Duration::days(7);

/// PKCE state cookie duration (10 minutes for OAuth flow).
pub const PKCE_STATE_DURATION: Duration = Duration::minutes(10);

/// Create cookies for storing authentication tokens.
///
/// Returns (access_cookie, Option<refresh_cookie>).
/// These are plain Cookie objects - the caller wraps them in CookieJar.
#[must_use]
pub fn set_auth_cookies(
    access_token: String,
    refresh_token: Option<String>,
) -> (Cookie<'static>, Option<Cookie<'static>>) {
    let access_cookie = Cookie::build((ACCESS_TOKEN_COOKIE, access_token))
        .http_only(true)
        .secure(true)
        .same_site(SameSite::Strict)
        .max_age(cookie::time::Duration::minutes(30))
        .path("/")
        .build();

    let refresh_cookie = refresh_token.map(|token| {
        Cookie::build((REFRESH_TOKEN_COOKIE, token))
            .http_only(true)
            .secure(true)
            .same_site(SameSite::Strict)
            .max_age(cookie::time::Duration::days(7))
            // Restricted path - only sent to refresh endpoint
            .path("/api/auth/refresh")
            .build()
    });

    (access_cookie, refresh_cookie)
}

/// Create cookies to clear authentication tokens (logout).
///
/// Returns cookies with max_age=0 to delete them.
#[must_use]
pub fn clear_auth_cookies<'a>() -> (Cookie<'a>, Cookie<'a>) {
    let access_cookie = Cookie::build((ACCESS_TOKEN_COOKIE, ""))
        .http_only(true)
        .secure(true)
        .same_site(SameSite::Strict)
        .max_age(cookie::time::Duration::ZERO)
        .path("/")
        .build();

    let refresh_cookie = Cookie::build((REFRESH_TOKEN_COOKIE, ""))
        .http_only(true)
        .secure(true)
        .same_site(SameSite::Strict)
        .max_age(cookie::time::Duration::ZERO)
        .path("/api/auth/refresh")
        .build();

    (access_cookie, refresh_cookie)
}

/// Create a cookie to store PKCE state during OAuth flow.
///
/// Stores csrf_token, nonce, and verifier as a pipe-separated string.
#[must_use]
pub fn set_pkce_cookie(csrf: &str, nonce: &str, verifier: &str) -> Cookie<'static> {
    let value = format!("{}|{}|{}", csrf, nonce, verifier);
    Cookie::build((PKCE_STATE_COOKIE, value))
        .http_only(true)
        .secure(true)
        .same_site(SameSite::Lax) // Lax needed for OAuth redirect
        .max_age(cookie::time::Duration::minutes(10))
        .path("/api/auth")
        .build()
}

/// Parse PKCE state from cookie value.
///
/// Returns (csrf_token, nonce, pkce_verifier) if valid.
#[must_use]
pub fn parse_pkce_cookie(value: &str) -> Option<(String, String, String)> {
    let parts: Vec<&str> = value.split('|').collect();
    if parts.len() == 3 {
        Some((
            parts[0].to_string(),
            parts[1].to_string(),
            parts[2].to_string(),
        ))
    } else {
        None
    }
}

/// Create a cookie to clear PKCE state.
#[must_use]
pub fn clear_pkce_cookie<'a>() -> Cookie<'a> {
    Cookie::build((PKCE_STATE_COOKIE, ""))
        .http_only(true)
        .secure(true)
        .same_site(SameSite::Lax)
        .max_age(cookie::time::Duration::ZERO)
        .path("/api/auth")
        .build()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn set_auth_cookies_creates_both() {
        let (access, refresh) =
            set_auth_cookies("access123".to_string(), Some("refresh456".to_string()));
        assert_eq!(access.name(), ACCESS_TOKEN_COOKIE);
        assert_eq!(access.value(), "access123");
        assert!(access.http_only().unwrap_or(false));

        let refresh = refresh.expect("refresh cookie should exist");
        assert_eq!(refresh.name(), REFRESH_TOKEN_COOKIE);
        assert_eq!(refresh.value(), "refresh456");
        assert_eq!(refresh.path().unwrap(), "/api/auth/refresh");
    }

    #[test]
    fn set_auth_cookies_without_refresh() {
        let (access, refresh) = set_auth_cookies("access123".to_string(), None);
        assert_eq!(access.name(), ACCESS_TOKEN_COOKIE);
        assert!(refresh.is_none());
    }

    #[test]
    fn clear_auth_cookies_zeros_max_age() {
        let (access, refresh) = clear_auth_cookies();
        assert_eq!(access.max_age(), Some(cookie::time::Duration::ZERO));
        assert_eq!(refresh.max_age(), Some(cookie::time::Duration::ZERO));
    }

    #[test]
    fn pkce_cookie_roundtrip() {
        let csrf = "csrf123";
        let nonce = "nonce456";
        let verifier = "verifier789";

        let cookie = set_pkce_cookie(csrf, nonce, verifier);
        let value = cookie.value();

        let (parsed_csrf, parsed_nonce, parsed_verifier) =
            parse_pkce_cookie(value).expect("should parse");

        assert_eq!(parsed_csrf, csrf);
        assert_eq!(parsed_nonce, nonce);
        assert_eq!(parsed_verifier, verifier);
    }

    #[test]
    fn parse_pkce_cookie_invalid() {
        assert!(parse_pkce_cookie("invalid").is_none());
        assert!(parse_pkce_cookie("a|b").is_none());
        assert!(parse_pkce_cookie("").is_none());
    }
}
