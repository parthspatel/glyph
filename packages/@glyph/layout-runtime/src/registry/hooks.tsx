/**
 * Registry Hooks
 *
 * React context and hooks for accessing the component registry.
 * Provides convenient API for resolving components in layout templates.
 */

import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { createRegistry, defaultRegistry, type ComponentRegistry } from './registry';
import { createResolver, type ComponentResolver, type ResolverOptions } from './resolver';

// Context for registry access
const RegistryContext = createContext<ComponentRegistry>(defaultRegistry);
const ResolverContext = createContext<ComponentResolver | null>(null);

export interface RegistryProviderProps {
  /** Registry to use (defaults to defaultRegistry) */
  registry?: ComponentRegistry;
  /** Resolver options (allowlist, callbacks) */
  resolverOptions?: ResolverOptions;
  /** Child components */
  children: ReactNode;
}

/**
 * Provides registry and resolver to child components.
 */
export function RegistryProvider({
  registry = defaultRegistry,
  resolverOptions,
  children,
}: RegistryProviderProps) {
  const resolver = useMemo(
    () => createResolver(registry, resolverOptions),
    [registry, resolverOptions]
  );

  return (
    <RegistryContext.Provider value={registry}>
      <ResolverContext.Provider value={resolver}>{children}</ResolverContext.Provider>
    </RegistryContext.Provider>
  );
}

/**
 * Access the component registry directly.
 */
export function useRegistry(): ComponentRegistry {
  return useContext(RegistryContext);
}

/**
 * Access the component resolver.
 * Must be used within RegistryProvider.
 */
export function useResolver(): ComponentResolver {
  const resolver = useContext(ResolverContext);
  if (!resolver) {
    throw new Error('useResolver must be used within RegistryProvider');
  }
  return resolver;
}

/**
 * Resolve a component by name.
 * Returns null if component not found or not allowed.
 */
export function useComponent(name: string) {
  const resolver = useResolver();
  return resolver.resolve(name);
}

/**
 * Check if a component can be resolved.
 */
export function useCanResolve(name: string): boolean {
  const resolver = useResolver();
  return resolver.canResolve(name);
}

export { createRegistry };
