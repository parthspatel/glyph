# Plan 03-02: JWKS + JWT Validation — Summary

**Status:** Complete
**Completed:** 2026-01-28

## Objective

Implement JWKS caching and JWT validation against Auth0's public keys.

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Implement JWKS cache | `849249b` | libs/auth/src/jwks.rs |
| 2 | Implement JWT validation | `12a3674` | libs/auth/src/jwt.rs, libs/auth/src/lib.rs |

## Deliverables

### JwksCache (libs/auth/src/jwks.rs)

```rust
pub struct JwksCache {
    keys: Arc<RwLock<JwkSet>>,
    jwks_url: String,
    http_client: reqwest::Client,
}
```

- `new(jwks_url)` — Create empty cache
- `refresh()` — Fetch JWKS from Auth0
- `get_key(kid)` — Get DecodingKey by key ID
- `get_or_refresh_key(kid)` — Auto-refresh on cache miss

### Claims (libs/auth/src/jwt.rs)

```rust
pub struct Claims {
    pub sub: String,
    pub iss: String,
    pub aud: Audience,
    pub exp: i64,
    pub iat: i64,
    pub email: Option<String>,
    pub email_verified: Option<bool>,
    pub name: Option<String>,
    pub picture: Option<String>,
    pub roles: Option<Vec<String>>,
}
```

### validate_jwt Function

```rust
pub async fn validate_jwt(
    token: &str,
    jwks: &JwksCache,
    config: &Auth0Config,
) -> AuthResult<Claims>
```

Validates:
- RS256 algorithm (explicit, prevents algorithm confusion)
- Issuer matches Auth0 domain
- Audience matches API identifier
- Token not expired (60-second leeway for clock skew)

## Verification

- [x] `cargo check -p glyph-auth` compiles
- [x] JwksCache fetches and caches JWK set
- [x] JwksCache refreshes on key miss (handles rotation)
- [x] validate_jwt enforces RS256 explicitly
- [x] validate_jwt checks issuer matches config
- [x] validate_jwt checks audience matches api_identifier
- [x] TokenExpired returned for expired tokens

## Deviations

None.

## Next

Plan 03-04 depends on this for CurrentUser extractor.
