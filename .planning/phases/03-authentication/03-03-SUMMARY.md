# Plan 03-03: OIDC Client — Summary

**Status:** Complete
**Completed:** 2026-01-28

## Objective

Implement Auth0 OIDC client for authorization code flow with PKCE.

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Implement Auth0Client with PKCE | `0df7481` | libs/auth/src/oidc.rs, libs/auth/src/lib.rs, Cargo.toml, libs/auth/Cargo.toml |

## Deliverables

### Auth0Client (libs/auth/src/oidc.rs)

```rust
pub struct Auth0Client {
    http_client: reqwest::Client,
    config: Auth0Config,
    authorization_endpoint: String,
    token_endpoint: String,
}
```

- `new(config)` — Initialize client with Auth0 endpoints
- `authorize_url()` — Generate authorization URL with PKCE
- `exchange_code(code, pkce_verifier, nonce)` — Exchange code for tokens
- `refresh_tokens(refresh_token)` — Refresh access token
- `logout_url(return_to)` — Generate federated logout URL

### AuthorizationData

```rust
pub struct AuthorizationData {
    pub url: String,
    pub csrf_token: String,
    pub nonce: String,
    pub pkce_verifier: String,
}
```

### OidcTokenResponse

```rust
pub struct OidcTokenResponse {
    pub access_token: String,
    pub refresh_token: Option<String>,
    pub id_token: String,
    pub expires_in: Duration,
}
```

### Dependencies Added

- `rand = "0.8"` — Random string generation
- `sha2 = "0.10"` — PKCE SHA256 challenge
- `base64 = "0.22"` — URL-safe base64 encoding

Removed `openidconnect = "4"` in favor of direct HTTP calls (simpler, Auth0 has well-known endpoints).

## Implementation Notes

Used direct HTTP calls instead of openidconnect crate due to complex type system in v4.0. Auth0's endpoints are well-documented and stable:
- Authorization: `https://{domain}/authorize`
- Token: `https://{domain}/oauth/token`
- Logout: `https://{domain}/v2/logout`

PKCE implemented manually with SHA256 challenge.

## Verification

- [x] `cargo check -p glyph-auth` compiles
- [x] authorize_url generates PKCE challenge with SHA256
- [x] authorize_url includes offline_access scope for refresh tokens
- [x] exchange_code returns access, refresh, and ID tokens
- [x] logout_url uses federated logout
- [x] All 10 tests pass

## Deviations

- **Simplified OIDC implementation**: Used direct HTTP calls instead of openidconnect crate. The openidconnect 4.0 type system proved too complex for our use case. Direct calls are simpler and Auth0's endpoints are stable.

## Next

Plan 03-05 depends on this for auth endpoints.
