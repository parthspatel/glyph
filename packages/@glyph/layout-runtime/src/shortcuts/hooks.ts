/**
 * React hooks for keyboard shortcut management.
 * Integrates with react-hotkeys-hook and the global registry.
 */

import { useEffect, useMemo } from "react";
import { useHotkeys, Options as HotkeyOptions } from "react-hotkeys-hook";
import { getShortcutRegistry } from "./registry";

export interface UseShortcutsOptions {
  /** Whether shortcuts are enabled */
  enabled?: boolean;
  /** Scope for these shortcuts */
  scope?: string;
  /** Element to attach listeners to */
  element?: HTMLElement | null;
  /** Enable in input fields */
  enableOnFormTags?: boolean;
}

/**
 * Hook for registering multiple shortcuts with conflict detection.
 * Automatically registers and unregisters from global registry.
 */
export function useShortcuts(
  shortcuts: Record<string, () => void>,
  options: UseShortcutsOptions = {},
): void {
  const { enabled = true, scope, element, enableOnFormTags = false } = options;

  const registry = useMemo(() => getShortcutRegistry(), []);

  // Register shortcuts on mount, unregister on unmount
  useEffect(() => {
    const ids: string[] = [];

    for (const [key, _handler] of Object.entries(shortcuts)) {
      const id = scope ? `${scope}.${key}` : key;
      registry.register({
        id,
        key,
        description: `${scope || "custom"}: ${key}`,
        scope,
        enabled,
      });
      ids.push(id);
    }

    return () => {
      for (const id of ids) {
        registry.unregister(id);
      }
    };
  }, [registry, scope, enabled]);

  // Set up hotkey listeners
  const keys = Object.keys(shortcuts).join(",");

  useHotkeys(
    keys,
    (event, handler) => {
      event.preventDefault();
      const key = handler.keys?.join("+") || "";
      const callback = shortcuts[key];
      if (callback && enabled) {
        callback();
      }
    },
    {
      enabled,
      enableOnFormTags: enableOnFormTags ? ["INPUT", "TEXTAREA", "SELECT"] : [],
      ...(element ? { element } : {}),
    } as HotkeyOptions,
  );
}

/**
 * Hook for standard layout-level shortcuts.
 * These are pre-registered in the global registry.
 */
export function useLayoutShortcuts(handlers: {
  onSubmit?: () => void;
  onSave?: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
}): void {
  const { onSubmit, onSave, onUndo, onRedo } = handlers;

  // Submit: Ctrl+Enter
  useHotkeys(
    "ctrl+enter",
    (e) => {
      e.preventDefault();
      onSubmit?.();
    },
    { enabled: !!onSubmit },
  );

  // Save: Ctrl+S
  useHotkeys(
    "ctrl+s",
    (e) => {
      e.preventDefault();
      onSave?.();
    },
    { enabled: !!onSave },
  );

  // Undo: Ctrl+Z
  useHotkeys(
    "ctrl+z",
    (e) => {
      e.preventDefault();
      onUndo?.();
    },
    { enabled: !!onUndo },
  );

  // Redo: Ctrl+Shift+Z or Ctrl+Y
  useHotkeys(
    "ctrl+shift+z,ctrl+y",
    (e) => {
      e.preventDefault();
      onRedo?.();
    },
    { enabled: !!onRedo },
  );
}

/**
 * Hook to get current shortcut binding for an action.
 * Useful for displaying shortcut hints in UI.
 */
export function useShortcutBinding(id: string): string | undefined {
  const registry = useMemo(() => getShortcutRegistry(), []);
  return registry.getBinding(id);
}

/**
 * Hook to check for shortcut conflicts.
 * Returns conflicts affecting the given scope.
 */
export function useShortcutConflicts(
  scope?: string,
): Array<{ key: string; ids: string[] }> {
  const registry = useMemo(() => getShortcutRegistry(), []);
  const conflicts = registry.getConflicts();

  if (!scope) return conflicts;

  return conflicts.filter((conflict) =>
    conflict.ids.some((id) => id.startsWith(`${scope}.`)),
  );
}
