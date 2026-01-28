//! NATS event publishing and subscription

use async_nats::Client;
use thiserror::Error;

#[derive(Debug, Error)]
pub enum MessagingError {
    #[error("Failed to connect to NATS: {0}")]
    ConnectionError(#[from] async_nats::ConnectError),

    #[error("Failed to publish message: {0}")]
    PublishError(#[from] async_nats::PublishError),

    #[error("Failed to subscribe: {0}")]
    SubscribeError(#[from] async_nats::SubscribeError),
}

/// Configuration for NATS connection
#[derive(Debug, Clone)]
pub struct NatsConfig {
    pub url: String,
}

impl Default for NatsConfig {
    fn default() -> Self {
        Self {
            url: String::from("nats://localhost:4222"),
        }
    }
}

/// Create a new NATS client
pub async fn create_nats_client(config: &NatsConfig) -> Result<Client, MessagingError> {
    let client = async_nats::connect(&config.url).await?;
    Ok(client)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_default_config() {
        let config = NatsConfig::default();
        assert_eq!(config.url, "nats://localhost:4222");
    }
}
