/**
 * WebSocket hook for real-time queue updates.
 * Establishes connection, handles reconnection with backoff, and broadcasts events.
 */
import { useEffect, useRef, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useQueueStore, UserPresence } from "../stores/queueStore";

const RECONNECT_DELAY = 3000;
const MAX_RECONNECT_ATTEMPTS = 5;
const HEARTBEAT_INTERVAL = 30000;

function getWsUrl(): string {
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${window.location.host}/api/v1/queue/ws`;
}

/**
 * Hook to manage WebSocket connection for queue updates.
 * Automatically reconnects on disconnect with exponential backoff.
 */
export function useQueueWebSocket(currentProjectId?: string) {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttempts = useRef(0);
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const queryClient = useQueryClient();
  const { setConnected, setLastEvent, updatePresence } = useQueueStore();
  const wsConnected = useQueueStore((s) => s.wsConnected);

  const handleQueueEvent = useCallback(
    (event: Record<string, unknown>) => {
      switch (event.type) {
        case "task_assigned":
          queryClient.invalidateQueries({ queryKey: ["queue"] });
          console.info("[Queue] New task assigned");
          break;

        case "task_unavailable":
          queryClient.invalidateQueries({ queryKey: ["queue"] });
          console.warn(`[Queue] Task unavailable: ${event.reason}`);
          break;

        case "task_status_changed":
          queryClient.invalidateQueries({ queryKey: ["queue"] });
          break;

        case "task_reassigned":
          queryClient.invalidateQueries({ queryKey: ["queue"] });
          console.info("[Queue] Task reassigned");
          break;

        case "presence_update":
          if (
            typeof event.project_id === "string" &&
            Array.isArray(event.users)
          ) {
            updatePresence(event.project_id, event.users as UserPresence[]);
          }
          break;

        default:
          console.debug("[Queue] Unknown event type:", event.type);
      }
    },
    [queryClient, updatePresence],
  );

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const ws = new WebSocket(getWsUrl());

    ws.onopen = () => {
      console.info("[Queue] WebSocket connected");
      setConnected(true);
      reconnectAttempts.current = 0;
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as Record<string, unknown>;
        if (typeof data.type === "string") {
          setLastEvent({ type: data.type, ...data });
        }
        handleQueueEvent(data);
      } catch (e) {
        console.error("[Queue] Failed to parse WebSocket message:", e);
      }
    };

    ws.onclose = () => {
      console.info("[Queue] WebSocket disconnected");
      setConnected(false);

      if (reconnectAttempts.current < MAX_RECONNECT_ATTEMPTS) {
        reconnectAttempts.current++;
        const delay = RECONNECT_DELAY * reconnectAttempts.current;
        console.info(`[Queue] Reconnecting in ${delay}ms...`);
        setTimeout(connect, delay);
      } else {
        console.warn("[Queue] Max reconnection attempts reached");
      }
    };

    ws.onerror = (error) => {
      console.error("[Queue] WebSocket error:", error);
    };

    wsRef.current = ws;
  }, [setConnected, setLastEvent, handleQueueEvent]);

  // Establish connection on mount
  useEffect(() => {
    connect();
    return () => {
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, [connect]);

  // Presence heartbeat - signals active user on project
  useEffect(() => {
    if (!wsConnected || !currentProjectId || !wsRef.current) {
      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current);
        heartbeatRef.current = null;
      }
      return;
    }

    const sendHeartbeat = () => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({
            type: "presence_heartbeat",
            project_id: currentProjectId,
          }),
        );
      }
    };

    // Send immediately, then every 30s
    sendHeartbeat();
    heartbeatRef.current = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL);

    return () => {
      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current);
        heartbeatRef.current = null;
      }
    };
  }, [wsConnected, currentProjectId]);

  return { connected: wsConnected };
}
