/**
 * Component Resolver
 *
 * Resolves component names to their implementations with security checks.
 * Enforces component allowlists to prevent unauthorized component usage.
 */

import type { ComponentType } from 'react';
import type { ComponentRegistry } from './registry';

export interface ResolverOptions {
  /** If set, only these components can be resolved */
  allowedComponents?: string[];
  /** Callback when an unknown component is requested */
  onUnknownComponent?: (name: string) => void;
  /** Callback when a disallowed component is requested */
  onDisallowedComponent?: (name: string) => void;
}

export interface ComponentResolver {
  /** Resolve a component by name, returns null if not found/allowed */
  resolve(name: string): ComponentType<unknown> | null;
  /** Check if a component can be resolved */
  canResolve(name: string): boolean;
  /** Get list of allowed component names */
  getAllowed(): string[];
}

/**
 * Create a resolver with security allowlist.
 */
export function createResolver(
  registry: ComponentRegistry,
  options: ResolverOptions = {}
): ComponentResolver {
  const { allowedComponents, onUnknownComponent, onDisallowedComponent } = options;

  // Validate allowlist against registry
  if (allowedComponents) {
    for (const name of allowedComponents) {
      if (!registry.has(name)) {
        console.warn(`Allowlisted component "${name}" not found in registry`);
      }
    }
  }

  return {
    resolve(name: string): ComponentType<unknown> | null {
      // Check if component exists
      if (!registry.has(name)) {
        onUnknownComponent?.(name);
        console.error(
          `Unknown component: "${name}". Available: ${Array.from(registry.getAll().keys()).join(', ')}`
        );
        return null;
      }

      // Check allowlist
      if (allowedComponents && !allowedComponents.includes(name)) {
        onDisallowedComponent?.(name);
        console.error(`Component "${name}" not in allowlist for this layout`);
        return null;
      }

      const registered = registry.get(name)!;
      return registered.component;
    },

    canResolve(name: string): boolean {
      if (!registry.has(name)) return false;
      if (allowedComponents && !allowedComponents.includes(name)) return false;
      return true;
    },

    getAllowed(): string[] {
      if (allowedComponents) return [...allowedComponents];
      return Array.from(registry.getAll().keys());
    },
  };
}

/**
 * Fallback component for unknown/disallowed components.
 */
export function UnknownComponent({ name }: { name: string }) {
  return (
    <div className="p-4 bg-destructive/10 border border-destructive rounded-md">
      <p className="text-destructive font-medium">Unknown component: {name}</p>
      <p className="text-sm text-muted-foreground">
        This component is not registered or not allowed in this layout.
      </p>
    </div>
  );
}

/**
 * Error boundary fallback for component render errors.
 */
export function ComponentError({ name, error }: { name: string; error: Error }) {
  return (
    <div className="p-4 bg-destructive/10 border border-destructive rounded-md">
      <p className="text-destructive font-medium">Error rendering: {name}</p>
      <pre className="text-xs mt-2 overflow-auto">{error.message}</pre>
    </div>
  );
}
