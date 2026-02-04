/**
 * Global shortcut registry for conflict detection and management.
 * Prevents multiple components from binding the same key.
 */

export interface ShortcutDefinition {
  /** Unique identifier, e.g., 'nerTagger.addEntity' */
  id: string;
  /** Key combination, e.g., 'e', 'ctrl+z', 'shift+enter' */
  key: string;
  /** Human-readable description */
  description: string;
  /** Component that owns this shortcut */
  scope?: string;
  /** Whether this shortcut is currently enabled */
  enabled?: boolean;
}

export interface ShortcutConflict {
  key: string;
  ids: string[];
}

export interface ShortcutRegistry {
  register(def: ShortcutDefinition): void;
  unregister(id: string): void;
  getBinding(id: string): string | undefined;
  getDefinition(id: string): ShortcutDefinition | undefined;
  getConflicts(): ShortcutConflict[];
  getAllBindings(): Map<string, ShortcutDefinition>;
  setEnabled(id: string, enabled: boolean): void;
  clear(): void;
}

/**
 * Default layout-level shortcuts.
 * These are reserved and should not be overridden by components.
 */
export const LAYOUT_SHORTCUTS = {
  'layout.submit': 'ctrl+enter',
  'layout.save': 'ctrl+s',
  'layout.undo': 'ctrl+z',
  'layout.redo': 'ctrl+shift+z',
  'layout.redoAlt': 'ctrl+y',
} as const;

/**
 * Creates a new shortcut registry instance.
 */
export function createShortcutRegistry(): ShortcutRegistry {
  const bindings = new Map<string, ShortcutDefinition>();
  const keyToIds = new Map<string, Set<string>>();

  function normalizeKey(key: string): string {
    // Normalize key format: lowercase, consistent modifier order
    return key
      .toLowerCase()
      .split('+')
      .sort((a, b) => {
        const order = ['ctrl', 'alt', 'shift', 'meta'];
        const aIdx = order.indexOf(a);
        const bIdx = order.indexOf(b);
        if (aIdx === -1 && bIdx === -1) return 0;
        if (aIdx === -1) return 1;
        if (bIdx === -1) return -1;
        return aIdx - bIdx;
      })
      .join('+');
  }

  function addKeyMapping(key: string, id: string): void {
    const normalized = normalizeKey(key);
    if (!keyToIds.has(normalized)) {
      keyToIds.set(normalized, new Set());
    }
    keyToIds.get(normalized)!.add(id);
  }

  function removeKeyMapping(key: string, id: string): void {
    const normalized = normalizeKey(key);
    const ids = keyToIds.get(normalized);
    if (ids) {
      ids.delete(id);
      if (ids.size === 0) {
        keyToIds.delete(normalized);
      }
    }
  }

  return {
    register(def: ShortcutDefinition): void {
      const existing = bindings.get(def.id);
      if (existing) {
        // Update existing binding
        removeKeyMapping(existing.key, def.id);
      }

      bindings.set(def.id, { ...def, enabled: def.enabled ?? true });
      addKeyMapping(def.key, def.id);

      // Warn about conflicts
      const normalized = normalizeKey(def.key);
      const conflictingIds = keyToIds.get(normalized);
      if (conflictingIds && conflictingIds.size > 1) {
        console.warn(
          `[ShortcutRegistry] Conflict detected for key "${def.key}": ${Array.from(conflictingIds).join(', ')}`
        );
      }
    },

    unregister(id: string): void {
      const def = bindings.get(id);
      if (def) {
        removeKeyMapping(def.key, id);
        bindings.delete(id);
      }
    },

    getBinding(id: string): string | undefined {
      return bindings.get(id)?.key;
    },

    getDefinition(id: string): ShortcutDefinition | undefined {
      return bindings.get(id);
    },

    getConflicts(): ShortcutConflict[] {
      const conflicts: ShortcutConflict[] = [];
      for (const [key, ids] of keyToIds) {
        if (ids.size > 1) {
          conflicts.push({ key, ids: Array.from(ids) });
        }
      }
      return conflicts;
    },

    getAllBindings(): Map<string, ShortcutDefinition> {
      return new Map(bindings);
    },

    setEnabled(id: string, enabled: boolean): void {
      const def = bindings.get(id);
      if (def) {
        def.enabled = enabled;
      }
    },

    clear(): void {
      bindings.clear();
      keyToIds.clear();
    },
  };
}

// Global singleton registry
let globalRegistry: ShortcutRegistry | null = null;

/**
 * Get or create the global shortcut registry.
 */
export function getShortcutRegistry(): ShortcutRegistry {
  if (!globalRegistry) {
    globalRegistry = createShortcutRegistry();

    // Register default layout shortcuts
    for (const [id, key] of Object.entries(LAYOUT_SHORTCUTS)) {
      globalRegistry.register({
        id,
        key,
        description: `Layout: ${id.split('.')[1]}`,
        scope: 'layout',
      });
    }
  }
  return globalRegistry;
}

/**
 * Reset the global registry (for testing).
 */
export function resetShortcutRegistry(): void {
  globalRegistry = null;
}
