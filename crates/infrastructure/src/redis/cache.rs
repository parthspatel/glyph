//! Redis cache client

use deadpool_redis::{Config, Pool, Runtime};
use thiserror::Error;

#[derive(Debug, Error)]
pub enum CacheError {
    #[error("Failed to connect to Redis: {0}")]
    ConnectionError(#[from] deadpool_redis::CreatePoolError),

    #[error("Redis operation failed: {0}")]
    OperationError(#[from] deadpool_redis::redis::RedisError),

    #[error("Pool error: {0}")]
    PoolError(#[from] deadpool_redis::PoolError),
}

/// Configuration for Redis connection
#[derive(Debug, Clone)]
pub struct RedisConfig {
    pub url: String,
    pub max_connections: usize,
}

impl Default for RedisConfig {
    fn default() -> Self {
        Self {
            url: String::from("redis://localhost:6379"),
            max_connections: 16,
        }
    }
}

/// Create a new Redis connection pool
pub fn create_redis_pool(config: &RedisConfig) -> Result<Pool, CacheError> {
    let cfg = Config::from_url(&config.url);
    let pool = cfg.create_pool(Some(Runtime::Tokio1))?;
    Ok(pool)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_default_config() {
        let config = RedisConfig::default();
        assert_eq!(config.url, "redis://localhost:6379");
        assert_eq!(config.max_connections, 16);
    }
}
