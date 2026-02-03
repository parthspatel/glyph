/**
 * Zustand store for queue real-time state.
 * Manages WebSocket connection state and user presence separately from React Query.
 */
import { create } from "zustand";

/** Queue event from WebSocket */
export interface QueueEvent {
  type: string;
  [key: string]: unknown;
}

/** User presence info for collaboration awareness */
export interface UserPresence {
  user_id: string;
  display_name: string;
  avatar_url?: string;
  last_seen_at: string;
}

interface QueueState {
  /** WebSocket connection status */
  wsConnected: boolean;
  /** Most recent event received */
  lastEvent: QueueEvent | null;
  /** Active users indexed by project ID */
  presenceByProject: Record<string, UserPresence[]>;

  setConnected: (connected: boolean) => void;
  setLastEvent: (event: QueueEvent) => void;
  updatePresence: (projectId: string, users: UserPresence[]) => void;
  clearPresence: (projectId: string) => void;
}

export const useQueueStore = create<QueueState>((set) => ({
  wsConnected: false,
  lastEvent: null,
  presenceByProject: {},

  setConnected: (connected) => set({ wsConnected: connected }),

  setLastEvent: (event) => set({ lastEvent: event }),

  updatePresence: (projectId, users) =>
    set((state) => ({
      presenceByProject: { ...state.presenceByProject, [projectId]: users },
    })),

  clearPresence: (projectId) =>
    set((state) => {
      const { [projectId]: _, ...rest } = state.presenceByProject;
      return { presenceByProject: rest };
    }),
}));
