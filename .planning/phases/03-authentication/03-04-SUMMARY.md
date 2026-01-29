# Plan 03-04: Token Cookies + CurrentUser — Summary

**Status:** Complete
**Completed:** 2026-01-28

## Objective

Implement secure token storage in HttpOnly cookies and CurrentUser extractor for authenticated handlers.

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Implement token cookie helpers | `8802e34` | libs/auth/src/tokens.rs, libs/auth/src/lib.rs, Cargo.toml, libs/auth/Cargo.toml |
| 2 | Implement CurrentUser extractor | `636bce8` | apps/api/src/extractors/current_user.rs, apps/api/src/extractors/mod.rs |

## Deliverables

### Token Cookie Helpers (libs/auth/src/tokens.rs)

Constants:
- `ACCESS_TOKEN_COOKIE = "glyph_access_token"`
- `REFRESH_TOKEN_COOKIE = "glyph_refresh_token"`
- `PKCE_STATE_COOKIE = "glyph_pkce_state"`

Functions:
- `set_auth_cookies(access, refresh)` — Create secure cookies for tokens
- `clear_auth_cookies()` — Create cookies with max_age=0 for logout
- `set_pkce_cookie(csrf, nonce, verifier)` — Store OAuth state
- `parse_pkce_cookie(value)` — Parse stored OAuth state
- `clear_pkce_cookie()` — Clear OAuth state after callback

Cookie Security:
- HttpOnly (XSS protection)
- Secure (HTTPS only)
- SameSite=Strict (CSRF protection for auth cookies)
- SameSite=Lax (for PKCE cookie, needed for OAuth redirect)
- Refresh token restricted to `/api/auth/refresh` path

### AuthState (apps/api/src/extractors/current_user.rs)

```rust
pub struct AuthState {
    pub jwks_cache: Arc<JwksCache>,
    pub auth0_config: Arc<Auth0Config>,
}
```

Added to request extensions in main.rs for handlers to access.

### CurrentUser Extractor

```rust
pub struct CurrentUser {
    pub user_id: UserId,    // Placeholder until Phase 4
    pub auth0_id: String,
    pub email: Option<String>,
    pub email_verified: bool,
    pub name: Option<String>,
    pub roles: Vec<String>,
}
```

Methods:
- `has_role(role)` — Check if user has specific role
- `has_any_role(roles)` — Check if user has any of the roles

### Dependencies Added

- `cookie = { version = "0.18", features = ["private"] }`

## Verification

- [x] `cargo check -p glyph-auth -p glyph-api` compiles
- [x] Access token cookie is HttpOnly, Secure, SameSite=Strict
- [x] Refresh token cookie has restricted path /api/auth/refresh
- [x] CurrentUser extracts from cookie (not Authorization header)
- [x] Missing token returns 401 Unauthorized
- [x] CurrentUser provides user_id, email, roles
- [x] All 15 tests pass

## Deviations

None.

## Next

Plan 03-05 depends on this for auth endpoints.
