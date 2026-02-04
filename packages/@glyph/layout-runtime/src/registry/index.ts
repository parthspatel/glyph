/**
 * Component Registry Module
 *
 * Provides component registration, lookup, and resolution with security.
 * Components are registered by name and resolved at render time.
 */

export {
  createRegistry,
  defaultRegistry,
  type ComponentRegistry,
  type RegisteredComponent,
} from './registry';

export {
  createResolver,
  UnknownComponent,
  ComponentError,
  type ComponentResolver,
  type ResolverOptions,
} from './resolver';

export {
  RegistryProvider,
  useRegistry,
  useResolver,
  useComponent,
  useCanResolve,
  type RegistryProviderProps,
} from './hooks';
