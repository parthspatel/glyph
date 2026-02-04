/**
 * Data Binding Context
 *
 * Provides access to input, output, context, config, and user
 * data within layout templates and components.
 */

import { createContext, useContext, useCallback, useMemo, type ReactNode } from 'react';
import type * as Y from 'yjs';

export interface UserInfo {
  id: string;
  name: string;
  role: string;
}

export interface BindingContextValue {
  /** Task input data (read-only) */
  input: Record<string, unknown>;
  /** Annotation output (Y.js Map for sync) */
  output: Y.Map<unknown>;
  /** Additional layout context (read-only) */
  context: Record<string, unknown>;
  /** Layout configuration (read-only) */
  config: Record<string, unknown>;
  /** Current user info (read-only) */
  user: UserInfo;

  /** Set an output field value */
  setOutput: (field: string, value: unknown) => void;

  /** Get a value by binding path (e.g., "input.text") */
  getBinding: (path: string) => unknown;
}

const BindingContext = createContext<BindingContextValue | null>(null);

export interface BindingProviderProps {
  /** Task input data */
  input: Record<string, unknown>;
  /** Y.js Map for output (from sync context) */
  outputMap: Y.Map<unknown>;
  /** Additional context */
  context?: Record<string, unknown>;
  /** Layout configuration */
  config?: Record<string, unknown>;
  /** Current user */
  user: UserInfo;
  /** Child components */
  children: ReactNode;
}

/**
 * Provides binding context to child components.
 */
export function BindingProvider({
  input,
  outputMap,
  context = {},
  config = {},
  user,
  children,
}: BindingProviderProps) {
  const setOutput = useCallback(
    (field: string, value: unknown) => {
      outputMap.set(field, value);
    },
    [outputMap]
  );

  const getBinding = useCallback(
    (path: string): unknown => {
      const [root, ...parts] = path.split('.');

      let source: Record<string, unknown> | null = null;
      switch (root) {
        case 'input':
          source = input;
          break;
        case 'output':
          source = Object.fromEntries(outputMap.entries());
          break;
        case 'context':
          source = context;
          break;
        case 'config':
          source = config;
          break;
        case 'user':
          source = user as unknown as Record<string, unknown>;
          break;
        default:
          return undefined;
      }

      let current: unknown = source;
      for (const part of parts) {
        if (current == null || typeof current !== 'object') return undefined;
        current = (current as Record<string, unknown>)[part];
      }

      return current;
    },
    [input, outputMap, context, config, user]
  );

  const value = useMemo(
    () => ({
      input,
      output: outputMap,
      context,
      config,
      user,
      setOutput,
      getBinding,
    }),
    [input, outputMap, context, config, user, setOutput, getBinding]
  );

  return <BindingContext.Provider value={value}>{children}</BindingContext.Provider>;
}

/**
 * Access the binding context.
 */
export function useBinding(): BindingContextValue {
  const ctx = useContext(BindingContext);
  if (!ctx) {
    throw new Error('useBinding must be used within BindingProvider');
  }
  return ctx;
}

/**
 * Get a bound value from a path.
 */
export function useBoundValue<T>(path: string, defaultValue: T): T {
  const { getBinding } = useBinding();
  const value = getBinding(path);
  return (value as T) ?? defaultValue;
}

/**
 * Get a setter for an output field.
 */
export function useOutputSetter(field: string): (value: unknown) => void {
  const { setOutput } = useBinding();
  return useCallback((value: unknown) => setOutput(field, value), [setOutput, field]);
}
