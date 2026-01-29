# Plan 03-01: Auth Foundation — Summary

**Status:** Complete
**Completed:** 2026-01-28

## Objective

Set up authentication foundation with Auth0 configuration, expanded error types, and required dependencies.

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Add authentication dependencies to workspace | `7bea12c` | Cargo.toml, libs/auth/Cargo.toml, apps/api/Cargo.toml |
| 2 | Create Auth0Config and error modules | `3b07815` | libs/auth/src/config.rs, libs/auth/src/error.rs |
| 3 | Update lib.rs module structure | `34fb6ee` | libs/auth/src/lib.rs |

## Deliverables

### Dependencies Added

**Workspace (Cargo.toml):**
- `jsonwebtoken = "9"` — JWT encoding/decoding
- `openidconnect = "4"` — OIDC client
- `reqwest = { version = "0.12", features = ["json", "rustls-tls"] }` — HTTP client

**libs/auth:**
- jsonwebtoken, openidconnect, reqwest (workspace refs)

**apps/api:**
- `axum-extra = { version = "0.10", features = ["cookie-private"] }` — Encrypted cookies
- reqwest (workspace ref)

### Auth0Config (libs/auth/src/config.rs)

```rust
pub struct Auth0Config {
    pub domain: String,
    pub client_id: String,
    pub client_secret: String,
    pub api_identifier: String,
    pub callback_url: String,
    pub logout_redirect_url: String,
}
```

- `from_env()` — Loads from AUTH0_* environment variables
- `issuer()` — Returns `https://{domain}/`
- `jwks_url()` — Returns `https://{domain}/.well-known/jwks.json`

### AuthError (libs/auth/src/error.rs)

13 error variants covering all auth failure modes:
- `InvalidToken { reason }` — Malformed or bad signature
- `TokenExpired` — Expired JWT
- `MissingToken` — No token in request
- `KeyNotFound { kid }` — JWKS key not found
- `JwksFetchError` — JWKS fetch failed
- `DiscoveryError` — OIDC discovery failed
- `TokenExchangeError` — Code exchange failed
- `InvalidState` — CSRF mismatch
- `InvalidNonce` — Nonce mismatch
- `InsufficientPermissions` — Authorization denied
- `UserNotFound` — User not in DB
- `UserDeactivated` — Account disabled
- `Config` — Configuration error (From impl)
- `Internal` — Unexpected errors

## Verification

- [x] `cargo check -p glyph-auth -p glyph-api` compiles
- [x] `cargo test -p glyph-auth` passes (4 tests)
- [x] Auth0Config::from_env() reads all 6 required env vars
- [x] AuthError has 13 variants covering all failure cases
- [x] Public re-exports work: `use glyph_auth::{Auth0Config, AuthError}`

## Deviations

None.

## Next

Plan 03-02 (JWKS + JWT) and 03-03 (OIDC Client) can now proceed in parallel (Wave 2).
