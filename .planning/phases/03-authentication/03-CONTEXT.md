# Phase 3: Authentication - Context

**Gathered:** 2026-01-28
**Status:** Ready for planning

<domain>
## Phase Boundary

Implement JWT authentication with Auth0 integration and RBAC middleware. Users authenticate via SSO providers through Auth0, receive JWT tokens stored securely, and protected API routes verify authorization. Includes session management, token lifecycle, and comprehensive audit logging.

</domain>

<decisions>
## Implementation Decisions

### Auth Flow Behavior
- Modal overlay for login with SSO provider buttons (Login with X)
- Context-aware redirect after login — return to original page or appropriate next page
- Shared session across browser tabs — login once, authenticated everywhere
- All devices stay logged in — sessions are independent, no limit
- Modal always dismissible — users can close and browse public content
- Remember login intent — store original destination, restore on next login attempt
- No "Remember me" option — consistent session duration for everyone
- Logout clears app session + Auth0 session (federated logout), but not upstream providers

### Error Responses
- Silent refresh attempt first on token expiry, show modal only if that fails
- Combination approach for unauthorized access: hide in navigation, show "Access Denied" if URL accessed directly (context-dependent by screen/element)
- Distinct flows: deactivated account shows specific message with no retry; expired session shows login modal
- Consolidate multiple rapid errors into one summarized message
- Friendly messages to users, technical details in browser console/logs
- Show support contact only after 2-3 repeated failures
- Log all permission failures for security review

### Token Management
- Access tokens: 30 minutes validity
- Refresh tokens: 7 days validity
- Rotating refresh tokens — each refresh invalidates old token, issues new one
- HttpOnly cookies for token storage — XSS-proof, automatic transmission, CSRF protection
- Admin can revoke sessions immediately via Auth0 refresh token revocation
- 30-minute worst-case window for revoked access tokens (acceptable tradeoff for simplicity)

### Audit Logging
- Comprehensive event capture: login, logout, token refresh, permission denied, session created/revoked, password reset, role changes, protected resource access
- Detailed log entries: timestamp, user ID, event type, IP address, user agent, success/failure, request path, request ID, geo-location, session ID
- Configurable retention period with sensible default (e.g., 90 days)
- Separate storage from application logs with different access controls
- Configurable audit log access via RBAC (scoped by team, project, etc.)
- OpenTelemetry format for standard integration with observability backends
- Async with guaranteed delivery — queue to buffer, worker persists, no data loss
- Configurable PII redaction based on compliance needs (GDPR, etc.)
- Basic built-in alerting (account lockout, admin actions), complex patterns deferred to external SIEM

### Claude's Discretion
- SSO button implementation — prioritize ease of implementation (likely Auth0 Universal Login)
- Skeleton UI for auth loading state (immediate structure, not blank loader or optimistic render)
- Spinner with "Signing you in..." text during SSO flow
- Show error in modal on failed SSO (not auto-close with toast)
- No timeout on SSO flow — let Auth0/provider handle their own expiry
- Silent authentication enabled — use Auth0's checkSession for seamless session continuity
- Basic audit log UI with export capability (not full search UI, not export-only)
- No break glass mechanism — use RBAC with temporary permission grants

</decisions>

<specifics>
## Specific Ideas

- "Login with X" buttons in modal — familiar SSO pattern
- Auth0 federated logout ensures "logout means logout" on shared computers
- OpenTelemetry format enables correlation of auth events with request traces
- Async audit logging keeps annotation work fast while guaranteeing event capture

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 03-authentication*
*Context gathered: 2026-01-28*
