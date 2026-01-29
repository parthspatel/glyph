# Phase 3: Authentication - Research

**Researched:** 2026-01-28
**Domain:** JWT/OAuth2/OIDC Authentication with Auth0
**Confidence:** HIGH

## Summary

Phase 3 implements JWT-based authentication with Auth0 as the identity provider. The established Rust ecosystem provides mature, well-tested crates for this domain. The `jsonwebtoken` crate handles JWT validation against Auth0's JWKS endpoint, while `openidconnect` provides the complete OAuth2/OIDC authorization code flow with PKCE. Token storage uses HttpOnly cookies via `axum-extra`'s `PrivateCookieJar` for XSS protection.

The existing codebase has placeholder structures in `libs/auth` and `apps/api/src/middleware/auth.rs` ready to be implemented. The RFC 7807 error handling from Phase 2 already includes `Unauthorized` and `Forbidden` variants that integrate with the auth system.

**Primary recommendation:** Use `jsonwebtoken` + `openidconnect` for Auth0 integration, `axum-extra` cookies for token storage, and implement `CurrentUser` as a `FromRequestParts` extractor for type-safe authentication in handlers.

## Standard Stack

The established libraries for Rust JWT/Auth0 authentication:

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `jsonwebtoken` | 9.x | JWT encoding/decoding, JWKS validation | De-facto Rust JWT library, RS256 support, JWK parsing built-in |
| `openidconnect` | 4.x | OIDC authorization code flow, PKCE | Reference OIDC implementation, type-safe, provider discovery |
| `axum-extra` | 0.10.x | Cookie management with encryption | First-party Axum support, PrivateCookieJar for secure cookies |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `reqwest` | 0.12.x | HTTP client for JWKS/OIDC | Already in workspace, needed for Auth0 API calls |
| `tower-cookies` | 0.11.x | Alternative cookie layer | Only if axum-extra insufficient |
| `cookie` | 0.18.x | Cookie primitives | Underlying cookie parsing (dep of axum-extra) |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `jsonwebtoken` | `jwt-simple` | jwt-simple is simpler but less control over validation |
| `openidconnect` | Raw `oauth2` crate | oauth2 requires manual OIDC extension, more code |
| Cookie storage | `tower-sessions` | Sessions add server-side state, we want stateless JWT |

**Dependencies to add to `libs/auth/Cargo.toml`:**
```toml
jsonwebtoken = "9"
openidconnect = "4"
reqwest = { version = "0.12", features = ["json", "rustls-tls"] }
```

**Dependencies to add to `apps/api/Cargo.toml`:**
```toml
axum-extra = { version = "0.10", features = ["cookie-private"] }
```

## Architecture Patterns

### Recommended Module Structure

```
libs/auth/
├── src/
│   ├── lib.rs              # Public API, re-exports
│   ├── config.rs           # Auth0Config struct, env loading
│   ├── jwt.rs              # JWT validation, Claims struct
│   ├── jwks.rs             # JWKS fetching and caching
│   ├── oidc.rs             # Authorization code flow, PKCE
│   ├── tokens.rs           # Access/refresh token management
│   └── error.rs            # AuthError enum (expand existing)

apps/api/src/
├── extractors/
│   ├── mod.rs
│   └── current_user.rs     # CurrentUser extractor
├── middleware/
│   └── auth.rs             # Auth middleware (expand existing)
```

### Pattern 1: CurrentUser Extractor

**What:** Custom Axum extractor that validates JWT and provides typed user context
**When to use:** Any route that requires authentication

```rust
// Source: Axum docs - Custom Extractors
use axum::extract::FromRequestParts;
use axum::http::request::Parts;

pub struct CurrentUser {
    pub user_id: UserId,
    pub email: String,
    pub roles: Vec<String>,
}

impl<S> FromRequestParts<S> for CurrentUser
where
    S: Send + Sync,
{
    type Rejection = ApiError;

    async fn from_request_parts(
        parts: &mut Parts,
        state: &S,
    ) -> Result<Self, Self::Rejection> {
        // 1. Extract JWT from cookie (not Authorization header per CONTEXT.md)
        // 2. Validate JWT signature against JWKS
        // 3. Check expiration
        // 4. Build CurrentUser from claims
    }
}

// Usage in handler
async fn get_profile(user: CurrentUser) -> Result<Json<Profile>, ApiError> {
    // user is guaranteed authenticated
}
```

### Pattern 2: JWKS Caching

**What:** Cache Auth0's public keys with background refresh
**When to use:** Always - reduces latency and Auth0 API calls

```rust
// Source: jsonwebtoken docs
use std::sync::Arc;
use tokio::sync::RwLock;

pub struct JwksCache {
    keys: Arc<RwLock<jsonwebtoken::jwk::JwkSet>>,
    issuer: String,
}

impl JwksCache {
    /// Fetch from https://{domain}/.well-known/jwks.json
    pub async fn refresh(&self) -> Result<(), AuthError> {
        // Fetch with reqwest, update RwLock
    }

    /// Get decoding key by kid from JWT header
    pub async fn get_key(&self, kid: &str) -> Option<DecodingKey> {
        let keys = self.keys.read().await;
        keys.find(kid).map(|jwk| DecodingKey::from_jwk(jwk).ok())?
    }
}
```

### Pattern 3: Cookie-based Token Storage

**What:** Store access/refresh tokens in encrypted HttpOnly cookies
**When to use:** All token storage (per CONTEXT.md decision)

```rust
// Source: axum-extra docs
use axum_extra::extract::cookie::{Cookie, PrivateCookieJar, Key};

// Set tokens after Auth0 callback
async fn auth_callback(
    jar: PrivateCookieJar,
    // ... other params
) -> (PrivateCookieJar, Redirect) {
    let access_cookie = Cookie::build(("access_token", access_token))
        .http_only(true)
        .secure(true)
        .same_site(SameSite::Strict)
        .max_age(Duration::minutes(30))
        .path("/")
        .build();

    let refresh_cookie = Cookie::build(("refresh_token", refresh_token))
        .http_only(true)
        .secure(true)
        .same_site(SameSite::Strict)
        .max_age(Duration::days(7))
        .path("/api/auth/refresh")  // Restrict refresh token path
        .build();

    (jar.add(access_cookie).add(refresh_cookie), Redirect::to("/"))
}
```

### Pattern 4: Auth0 Authorization Code Flow with PKCE

**What:** Complete OAuth2/OIDC flow using openidconnect crate
**When to use:** Login initiation and callback handling

```rust
// Source: openidconnect-rs docs
use openidconnect::{
    AuthorizationCode, CsrfToken, Nonce, PkceCodeChallenge,
    PkceCodeVerifier, core::CoreClient,
};

pub struct Auth0Client {
    client: CoreClient,
}

impl Auth0Client {
    /// Generate authorization URL for login
    pub fn authorize_url(&self) -> (Url, CsrfToken, Nonce, PkceCodeVerifier) {
        let (pkce_challenge, pkce_verifier) = PkceCodeChallenge::new_random_sha256();

        let (url, csrf_token, nonce) = self.client
            .authorize_url(
                CoreAuthenticationFlow::AuthorizationCode,
                CsrfToken::new_random,
                Nonce::new_random,
            )
            .add_scope(Scope::new("openid".to_string()))
            .add_scope(Scope::new("profile".to_string()))
            .add_scope(Scope::new("email".to_string()))
            .set_pkce_challenge(pkce_challenge)
            .url();

        (url, csrf_token, nonce, pkce_verifier)
    }

    /// Exchange authorization code for tokens
    pub async fn exchange_code(
        &self,
        code: AuthorizationCode,
        pkce_verifier: PkceCodeVerifier,
        nonce: &Nonce,
    ) -> Result<TokenResponse, AuthError> {
        // ...
    }
}
```

### Anti-Patterns to Avoid

- **Storing JWT in localStorage/sessionStorage:** XSS vulnerable - use HttpOnly cookies
- **Validating JWT without checking `iss` and `aud`:** Must verify issuer is your Auth0 domain and audience is your API identifier
- **Fetching JWKS on every request:** Cache keys, refresh periodically (24h recommended)
- **Using symmetric signing (HS256):** Auth0 uses RS256, asymmetric keys required
- **Blocking JWKS refresh in request path:** Use background task for key rotation

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| JWT validation | Custom base64/JSON parsing | `jsonwebtoken` | Timing attacks, algorithm confusion, key handling |
| OIDC flow | Manual OAuth2 URLs | `openidconnect` | State management, PKCE, nonce validation |
| Cookie encryption | Custom encryption | `axum-extra::PrivateCookieJar` | Key management, timing attacks |
| JWKS fetching | Manual HTTP + JSON | `jsonwebtoken::jwk` built-in | Key format parsing, algorithm support |
| CSRF tokens | Custom random strings | `openidconnect::CsrfToken` | Cryptographic randomness, validation |

**Key insight:** Authentication is security-critical. Every hand-rolled component is a potential vulnerability. The Rust ecosystem has battle-tested solutions for all auth primitives.

## Common Pitfalls

### Pitfall 1: Algorithm Confusion Attack

**What goes wrong:** Accepting `HS256` when expecting `RS256` allows attacker to sign with public key
**Why it happens:** Default validation may accept any algorithm
**How to avoid:** Explicitly set algorithm in `Validation::new(Algorithm::RS256)`
**Warning signs:** JWT library not requiring explicit algorithm selection

### Pitfall 2: Missing Audience Validation

**What goes wrong:** Token for different API accepted by your API
**Why it happens:** Auth0 issues tokens with specific `aud` claim, easy to forget checking
**How to avoid:** Set `validation.set_audience(&[api_identifier])` in JWT validation
**Warning signs:** Tokens from other applications working on your API

### Pitfall 3: PKCE Verifier Storage

**What goes wrong:** Lost PKCE verifier between /login redirect and /callback
**Why it happens:** Verifier generated before redirect but needed after
**How to avoid:** Store verifier in server-side session or encrypted cookie alongside CSRF
**Warning signs:** "Invalid PKCE verifier" errors in callback

### Pitfall 4: Clock Skew on Token Expiration

**What goes wrong:** Valid tokens rejected as expired
**Why it happens:** Server clock slightly different from Auth0
**How to avoid:** Set `validation.set_leeway(60)` for 60-second tolerance
**Warning signs:** Intermittent "token expired" errors for fresh tokens

### Pitfall 5: Missing Nonce in ID Token

**What goes wrong:** Replay attacks possible
**Why it happens:** Not validating nonce claim matches what was sent in auth request
**How to avoid:** Always pass nonce to `id_token.claims(&verifier, &nonce)` in openidconnect
**Warning signs:** ID token validation not requiring nonce parameter

### Pitfall 6: Refresh Token Without Rotation

**What goes wrong:** Stolen refresh token valid forever
**Why it happens:** Not enabling rotation in Auth0 settings
**How to avoid:** Enable "Refresh Token Rotation" in Auth0 Application settings
**Warning signs:** Same refresh token working multiple times

## Code Examples

Verified patterns from official sources:

### JWT Validation with JWKS

```rust
// Source: jsonwebtoken docs
use jsonwebtoken::{decode, decode_header, DecodingKey, Validation, Algorithm};
use jsonwebtoken::jwk::JwkSet;

pub async fn validate_jwt(token: &str, jwks: &JwkSet, config: &Auth0Config) -> Result<Claims, AuthError> {
    // 1. Decode header to get key ID
    let header = decode_header(token)
        .map_err(|_| AuthError::InvalidToken)?;

    let kid = header.kid
        .ok_or(AuthError::InvalidToken)?;

    // 2. Find matching key in JWKS
    let jwk = jwks.find(&kid)
        .ok_or(AuthError::InvalidToken)?;

    let key = DecodingKey::from_jwk(jwk)
        .map_err(|_| AuthError::InvalidToken)?;

    // 3. Validate with explicit algorithm and claims
    let mut validation = Validation::new(Algorithm::RS256);
    validation.set_issuer(&[&config.issuer]);
    validation.set_audience(&[&config.api_identifier]);
    validation.set_leeway(60);

    let token_data = decode::<Claims>(token, &key, &validation)
        .map_err(|e| match e.kind() {
            jsonwebtoken::errors::ErrorKind::ExpiredSignature => AuthError::TokenExpired,
            _ => AuthError::InvalidToken,
        })?;

    Ok(token_data.claims)
}
```

### Auth0 Provider Discovery

```rust
// Source: openidconnect docs
use openidconnect::core::{CoreClient, CoreProviderMetadata};
use openidconnect::{ClientId, ClientSecret, IssuerUrl, RedirectUrl};

pub async fn create_auth0_client(config: &Auth0Config) -> Result<CoreClient, AuthError> {
    let http_client = reqwest::ClientBuilder::new()
        .redirect(reqwest::redirect::Policy::none())
        .build()
        .map_err(|_| AuthError::ConfigError)?;

    // Discover endpoints from .well-known/openid-configuration
    let issuer_url = IssuerUrl::new(config.issuer.clone())
        .map_err(|_| AuthError::ConfigError)?;

    let provider_metadata = CoreProviderMetadata::discover_async(
        issuer_url,
        &http_client,
    ).await
    .map_err(|_| AuthError::ConfigError)?;

    let client = CoreClient::from_provider_metadata(
        provider_metadata,
        ClientId::new(config.client_id.clone()),
        Some(ClientSecret::new(config.client_secret.clone())),
    )
    .set_redirect_uri(
        RedirectUrl::new(config.callback_url.clone())
            .map_err(|_| AuthError::ConfigError)?
    );

    Ok(client)
}
```

### Federated Logout

```rust
// Source: Auth0 docs - per CONTEXT.md decision for full logout
pub fn logout_url(config: &Auth0Config, return_to: &str) -> String {
    format!(
        "https://{}/v2/logout?client_id={}&returnTo={}&federated",
        config.domain,
        config.client_id,
        urlencoding::encode(return_to)
    )
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Session cookies | JWT in HttpOnly cookies | 2020+ | Stateless auth, easier horizontal scaling |
| Implicit flow | Auth Code + PKCE | OAuth 2.1 draft | Better security, no token in URL |
| Custom OAuth | OpenID Connect | 2024+ standard | Standardized claims, discovery |
| HS256 with shared secret | RS256 with JWKS | Auth0 default | No secret sharing, key rotation |

**Deprecated/outdated:**
- **Implicit flow:** Removed in OAuth 2.1, use Authorization Code + PKCE
- **Resource Owner Password Grant:** Auth0 discourages, use hosted login
- **Storing tokens in localStorage:** XSS vulnerable, use HttpOnly cookies

## Open Questions

Things that couldn't be fully resolved:

1. **JWKS Cache Refresh Strategy**
   - What we know: Auth0 recommends 24-hour cache, keys rotate rarely
   - What's unclear: Optimal backoff on refresh failure
   - Recommendation: 24-hour cache with 5-minute backoff on 4xx/5xx responses

2. **Geo-location for Audit Logs**
   - What we know: CONTEXT.md wants geo-location in audit entries
   - What's unclear: Which geo-IP service to use
   - Recommendation: Defer to external observability stack (DataDog/SIEM) or use MaxMind GeoLite2

3. **Silent Authentication for SPA**
   - What we know: CONTEXT.md mentions Auth0's checkSession
   - What's unclear: Whether this is needed with cookie-based tokens
   - Recommendation: With HttpOnly cookies, browser automatically sends tokens - silent auth may not be needed

## Sources

### Primary (HIGH confidence)
- `/keats/jsonwebtoken` - Context7 docs: JWT validation, JWKS parsing, RS256
- `/ramosbugs/openidconnect-rs` - Context7 docs: Authorization code flow, PKCE, provider discovery
- `/tokio-rs/axum` - Context7 docs: FromRequestParts extractors, middleware patterns

### Secondary (MEDIUM confidence)
- Auth0 documentation on federated logout and JWKS endpoints
- [oauth-kit](https://github.com/cachix/oauth-kit) - Batteries-included OAuth/OIDC for Axum
- [openidconnect-rs](https://github.com/ramosbugs/openidconnect-rs) - Reference OIDC implementation

### Tertiary (LOW confidence)
- WebSearch results on Auth0 + Rust patterns - verified against official docs

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Context7 verified, widely used crates
- Architecture: HIGH - Patterns from official Axum/openidconnect docs
- Pitfalls: HIGH - Known security issues, documented in OWASP/Auth0 guides

**Research date:** 2026-01-28
**Valid until:** 2026-02-28 (30 days - stable domain)
