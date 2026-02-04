/**
 * Component Registry
 *
 * Maps component names to their React implementations.
 * Supports both synchronous and lazy-loaded (code-split) components.
 */

import React, { type ComponentType, type LazyExoticComponent } from 'react';
import type { ComponentInterface } from '@glyph/components/interfaces';

type ComponentLoader = () => Promise<{ default: ComponentType<unknown> }>;

export interface RegisteredComponent {
  name: string;
  category: 'annotation' | 'layout' | 'form' | 'display' | 'control';
  component: ComponentType<unknown> | LazyExoticComponent<ComponentType<unknown>>;
  loader?: ComponentLoader;
  interface?: ComponentInterface;
}

export interface ComponentRegistry {
  /** Register a component synchronously */
  register(
    name: string,
    component: ComponentType<unknown>,
    options?: Partial<Omit<RegisteredComponent, 'name' | 'component'>>
  ): void;

  /** Register a lazy-loaded component for code splitting */
  registerLazy(
    name: string,
    loader: ComponentLoader,
    options?: Partial<Omit<RegisteredComponent, 'name' | 'component' | 'loader'>>
  ): void;

  /** Get a registered component by name */
  get(name: string): RegisteredComponent | undefined;

  /** Check if a component is registered */
  has(name: string): boolean;

  /** Get all registered components */
  getAll(): Map<string, RegisteredComponent>;

  /** Get components by category */
  getByCategory(category: RegisteredComponent['category']): RegisteredComponent[];
}

/**
 * Create a new component registry.
 */
export function createRegistry(): ComponentRegistry {
  const components = new Map<string, RegisteredComponent>();

  return {
    register(name, component, options = {}) {
      if (components.has(name)) {
        console.warn(`Component "${name}" already registered, overwriting`);
      }
      components.set(name, {
        name,
        category: options.category ?? 'annotation',
        component,
        interface: options.interface,
      });
    },

    registerLazy(name, loader, options = {}) {
      const lazy = React.lazy(loader);
      components.set(name, {
        name,
        category: options.category ?? 'annotation',
        component: lazy,
        loader,
        interface: options.interface,
      });
    },

    get(name) {
      return components.get(name);
    },

    has(name) {
      return components.has(name);
    },

    getAll() {
      return new Map(components);
    },

    getByCategory(category) {
      return Array.from(components.values()).filter((c) => c.category === category);
    },
  };
}

/** Default global registry */
export const defaultRegistry = createRegistry();
