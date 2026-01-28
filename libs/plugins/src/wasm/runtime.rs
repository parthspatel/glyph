//! WASM plugin runtime using wasmtime

use thiserror::Error;
use wasmtime::{Config, Engine, Module, Store};

#[derive(Debug, Error)]
pub enum WasmError {
    #[error("Failed to create WASM engine: {0}")]
    EngineError(#[from] wasmtime::Error),

    #[error("Failed to load module: {0}")]
    ModuleLoadError(String),

    #[error("Plugin execution failed: {0}")]
    ExecutionError(String),
}

/// Configuration for the WASM runtime
#[derive(Debug, Clone)]
pub struct WasmRuntimeConfig {
    pub max_memory_bytes: u64,
    pub max_execution_time_ms: u64,
    pub enable_bulk_memory: bool,
}

impl Default for WasmRuntimeConfig {
    fn default() -> Self {
        Self {
            max_memory_bytes: 64 * 1024 * 1024, // 64 MB
            max_execution_time_ms: 5000,        // 5 seconds
            enable_bulk_memory: true,
        }
    }
}

/// WASM plugin runtime
pub struct WasmRuntime {
    engine: Engine,
    #[allow(dead_code)]
    config: WasmRuntimeConfig,
}

impl WasmRuntime {
    /// Create a new WASM runtime
    pub fn new(runtime_config: WasmRuntimeConfig) -> Result<Self, WasmError> {
        let mut config = Config::new();
        config.wasm_bulk_memory(runtime_config.enable_bulk_memory);

        let engine = Engine::new(&config)?;

        Ok(Self {
            engine,
            config: runtime_config,
        })
    }

    /// Load a WASM module from bytes
    pub fn load_module(&self, wasm_bytes: &[u8]) -> Result<WasmModule, WasmError> {
        let module = Module::new(&self.engine, wasm_bytes)?;
        Ok(WasmModule {
            engine: self.engine.clone(),
            module,
        })
    }
}

/// A loaded WASM module
pub struct WasmModule {
    #[allow(dead_code)]
    engine: Engine,
    #[allow(dead_code)]
    module: Module,
}

impl WasmModule {
    /// Create a new instance of the module
    pub fn instantiate(&self) -> Result<WasmInstance, WasmError> {
        let store = Store::new(&self.engine, ());
        Ok(WasmInstance { store })
    }
}

/// An instantiated WASM module
pub struct WasmInstance {
    #[allow(dead_code)]
    store: Store<()>,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_default_config() {
        let config = WasmRuntimeConfig::default();
        assert_eq!(config.max_memory_bytes, 64 * 1024 * 1024);
        assert_eq!(config.max_execution_time_ms, 5000);
    }

    #[test]
    fn test_runtime_creation() {
        let config = WasmRuntimeConfig::default();
        let runtime = WasmRuntime::new(config);
        assert!(runtime.is_ok());
    }
}
