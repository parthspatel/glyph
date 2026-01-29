//! Audit logging for authentication events.
//!
//! Provides structured audit events for security review and compliance.
//! Events are emitted via tracing for OpenTelemetry compatibility.

use chrono::{DateTime, Utc};
use serde::Serialize;
use tracing::info;

/// Types of authentication audit events.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum AuditEventType {
    /// User initiated login flow
    Login,
    /// Login attempt failed
    LoginFailed,
    /// User logged out
    Logout,
    /// Access token refreshed successfully
    TokenRefresh,
    /// Token refresh failed
    TokenRefreshFailed,
    /// New session created after successful authentication
    SessionCreated,
    /// Session was revoked
    SessionRevoked,
    /// User attempted action without permission
    PermissionDenied,
    /// User accessed a protected resource
    ProtectedResourceAccess,
}

/// Audit event structure matching OpenTelemetry semantic conventions.
///
/// Captures all metadata required for security review and compliance.
#[derive(Debug, Clone, Serialize)]
pub struct AuditEvent {
    /// When the event occurred
    pub timestamp: DateTime<Utc>,
    /// Type of authentication event
    pub event_type: AuditEventType,
    /// User identifier (Auth0 sub or internal ID)
    pub user_id: Option<String>,
    /// Session identifier if available
    pub session_id: Option<String>,
    /// Unique request identifier for correlation
    pub request_id: String,
    /// Request path that triggered the event
    pub request_path: String,
    /// Client IP address
    pub ip_address: Option<String>,
    /// Client user agent string
    pub user_agent: Option<String>,
    /// Whether the operation succeeded
    pub success: bool,
    /// Error code if operation failed
    pub error_code: Option<String>,
    /// Additional event-specific details
    pub details: Option<serde_json::Value>,
}

impl AuditEvent {
    /// Create a new audit event with required fields.
    #[must_use]
    pub fn new(
        event_type: AuditEventType,
        request_id: impl Into<String>,
        request_path: impl Into<String>,
    ) -> Self {
        Self {
            timestamp: Utc::now(),
            event_type,
            user_id: None,
            session_id: None,
            request_id: request_id.into(),
            request_path: request_path.into(),
            ip_address: None,
            user_agent: None,
            success: true,
            error_code: None,
            details: None,
        }
    }

    /// Set the user identifier.
    #[must_use]
    pub fn with_user(mut self, user_id: impl Into<String>) -> Self {
        self.user_id = Some(user_id.into());
        self
    }

    /// Set the session identifier.
    #[must_use]
    pub fn with_session(mut self, session_id: impl Into<String>) -> Self {
        self.session_id = Some(session_id.into());
        self
    }

    /// Set the client IP address.
    #[must_use]
    pub fn with_ip(mut self, ip: impl Into<String>) -> Self {
        self.ip_address = Some(ip.into());
        self
    }

    /// Set the client user agent.
    #[must_use]
    pub fn with_user_agent(mut self, ua: impl Into<String>) -> Self {
        self.user_agent = Some(ua.into());
        self
    }

    /// Mark the event as a failure with an error code.
    #[must_use]
    pub fn with_failure(mut self, error_code: impl Into<String>) -> Self {
        self.success = false;
        self.error_code = Some(error_code.into());
        self
    }

    /// Add additional details to the event.
    #[must_use]
    pub fn with_details(mut self, details: serde_json::Value) -> Self {
        self.details = Some(details);
        self
    }
}

/// Emit an audit event via structured logging.
///
/// Events are logged to the `audit` target for filtering.
/// Use `RUST_LOG=audit=info` to see audit events.
///
/// This is non-blocking and integrates with OpenTelemetry via tracing.
pub fn emit_audit_event(event: AuditEvent) {
    info!(
        target: "audit",
        timestamp = %event.timestamp.to_rfc3339(),
        event_type = ?event.event_type,
        user_id = ?event.user_id,
        session_id = ?event.session_id,
        request_id = %event.request_id,
        request_path = %event.request_path,
        ip_address = ?event.ip_address,
        user_agent = ?event.user_agent,
        success = event.success,
        error_code = ?event.error_code,
        details = ?event.details,
        "auth_event"
    );
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn new_event_has_timestamp() {
        let event = AuditEvent::new(AuditEventType::Login, "req-123", "/login");
        assert!(!event.request_id.is_empty());
        assert_eq!(event.request_path, "/login");
        assert!(event.success);
    }

    #[test]
    fn builder_methods_set_fields() {
        let event = AuditEvent::new(AuditEventType::Login, "req-123", "/login")
            .with_user("user-456")
            .with_session("sess-789")
            .with_ip("192.168.1.1")
            .with_user_agent("Mozilla/5.0");

        assert_eq!(event.user_id, Some("user-456".to_string()));
        assert_eq!(event.session_id, Some("sess-789".to_string()));
        assert_eq!(event.ip_address, Some("192.168.1.1".to_string()));
        assert_eq!(event.user_agent, Some("Mozilla/5.0".to_string()));
    }

    #[test]
    fn with_failure_sets_error() {
        let event = AuditEvent::new(AuditEventType::LoginFailed, "req-123", "/login")
            .with_failure("invalid_credentials");

        assert!(!event.success);
        assert_eq!(event.error_code, Some("invalid_credentials".to_string()));
    }

    #[test]
    fn event_serializes_to_json() {
        let event =
            AuditEvent::new(AuditEventType::Login, "req-123", "/login").with_user("user-456");

        let json = serde_json::to_string(&event).expect("should serialize");
        assert!(json.contains("\"event_type\":\"login\""));
        assert!(json.contains("\"user_id\":\"user-456\""));
    }
}
