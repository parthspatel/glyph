//! Audit context extraction for authentication events.
//!
//! Provides helpers to extract client metadata from requests
//! for inclusion in audit events.

use axum::http::{HeaderMap, Request};

/// Audit context extracted from a request.
#[derive(Debug, Clone)]
pub struct AuditContext {
    /// Client IP address (from X-Forwarded-For or X-Real-IP)
    pub ip_address: Option<String>,
    /// Client user agent string
    pub user_agent: Option<String>,
    /// Request ID for correlation
    pub request_id: String,
}

impl AuditContext {
    /// Extract audit context from request headers.
    #[must_use]
    pub fn from_headers(headers: &HeaderMap) -> Self {
        let ip_address = headers
            .get("x-forwarded-for")
            .or_else(|| headers.get("x-real-ip"))
            .and_then(|v| v.to_str().ok())
            .map(|s| s.split(',').next().unwrap_or(s).trim().to_string());

        let user_agent = headers
            .get("user-agent")
            .and_then(|v| v.to_str().ok())
            .map(String::from);

        let request_id = headers
            .get("x-request-id")
            .and_then(|v| v.to_str().ok())
            .map(String::from)
            .unwrap_or_else(|| uuid::Uuid::new_v4().to_string());

        Self {
            ip_address,
            user_agent,
            request_id,
        }
    }

    /// Extract audit context from a request.
    #[must_use]
    pub fn from_request<B>(req: &Request<B>) -> Self {
        Self::from_headers(req.headers())
    }
}

/// Extract audit context tuple from request (ip, user_agent, request_id).
///
/// Convenience function for use in route handlers.
#[must_use]
pub fn audit_context<B>(req: &Request<B>) -> (Option<String>, Option<String>, String) {
    let ctx = AuditContext::from_request(req);
    (ctx.ip_address, ctx.user_agent, ctx.request_id)
}

#[cfg(test)]
mod tests {
    use super::*;
    use axum::http::HeaderValue;

    #[test]
    fn extracts_ip_from_x_forwarded_for() {
        let mut headers = HeaderMap::new();
        headers.insert("x-forwarded-for", HeaderValue::from_static("192.168.1.1"));

        let ctx = AuditContext::from_headers(&headers);
        assert_eq!(ctx.ip_address, Some("192.168.1.1".to_string()));
    }

    #[test]
    fn extracts_first_ip_from_chain() {
        let mut headers = HeaderMap::new();
        headers.insert(
            "x-forwarded-for",
            HeaderValue::from_static("192.168.1.1, 10.0.0.1, 172.16.0.1"),
        );

        let ctx = AuditContext::from_headers(&headers);
        assert_eq!(ctx.ip_address, Some("192.168.1.1".to_string()));
    }

    #[test]
    fn falls_back_to_x_real_ip() {
        let mut headers = HeaderMap::new();
        headers.insert("x-real-ip", HeaderValue::from_static("10.0.0.1"));

        let ctx = AuditContext::from_headers(&headers);
        assert_eq!(ctx.ip_address, Some("10.0.0.1".to_string()));
    }

    #[test]
    fn extracts_user_agent() {
        let mut headers = HeaderMap::new();
        headers.insert("user-agent", HeaderValue::from_static("Mozilla/5.0"));

        let ctx = AuditContext::from_headers(&headers);
        assert_eq!(ctx.user_agent, Some("Mozilla/5.0".to_string()));
    }

    #[test]
    fn uses_provided_request_id() {
        let mut headers = HeaderMap::new();
        headers.insert("x-request-id", HeaderValue::from_static("req-12345"));

        let ctx = AuditContext::from_headers(&headers);
        assert_eq!(ctx.request_id, "req-12345");
    }

    #[test]
    fn generates_request_id_if_missing() {
        let headers = HeaderMap::new();
        let ctx = AuditContext::from_headers(&headers);
        assert!(!ctx.request_id.is_empty());
        // Should be a valid UUID
        assert!(uuid::Uuid::parse_str(&ctx.request_id).is_ok());
    }
}
