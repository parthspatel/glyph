/**
 * Y.js Awareness Hooks
 *
 * React hooks for tracking user presence in real-time collaboration.
 * Uses the Y.js awareness protocol to share cursor positions, selections,
 * and active components between users.
 */

import { useState, useEffect, useCallback } from 'react';
import type { Awareness } from 'y-protocols/awareness';

export interface UserState {
  id: string;
  name: string;
  color: string;
}

export interface AwarenessState {
  user: UserState;
  cursor?: { x: number; y: number } | null;
  selection?: { start: number; end: number } | null;
  activeComponent?: string | null;
}

/**
 * Hook to track all remote users' awareness state.
 * Excludes the local user from the returned map.
 */
export function useAwareness(awareness: Awareness): Map<number, AwarenessState> {
  const [states, setStates] = useState<Map<number, AwarenessState>>(new Map());

  useEffect(() => {
    const update = () => {
      const newStates = new Map<number, AwarenessState>();
      awareness.getStates().forEach((state, clientId) => {
        if (state && clientId !== awareness.clientID) {
          newStates.set(clientId, state as AwarenessState);
        }
      });
      setStates(newStates);
    };

    awareness.on('change', update);
    update(); // Initial state

    return () => {
      awareness.off('change', update);
    };
  }, [awareness]);

  return states;
}

/**
 * Hook to update local user's awareness state.
 * Returns functions to update cursor, selection, and active component.
 */
export function useLocalAwareness(awareness: Awareness) {
  const updateCursor = useCallback(
    (cursor: { x: number; y: number } | null) => {
      awareness.setLocalStateField('cursor', cursor);
    },
    [awareness]
  );

  const updateSelection = useCallback(
    (selection: { start: number; end: number } | null) => {
      awareness.setLocalStateField('selection', selection);
    },
    [awareness]
  );

  const updateActiveComponent = useCallback(
    (componentId: string | null) => {
      awareness.setLocalStateField('activeComponent', componentId);
    },
    [awareness]
  );

  return { updateCursor, updateSelection, updateActiveComponent };
}

/**
 * Get list of remote users (excluding self).
 */
export function useRemoteUsers(awareness: Awareness): UserState[] {
  const states = useAwareness(awareness);
  return Array.from(states.values())
    .filter((s) => s.user)
    .map((s) => s.user);
}
