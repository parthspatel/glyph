# Plan 07-06 Summary: Task Detail and WebSocket Integration

## Status: COMPLETE

## What Was Built

### 1. Zustand Queue Store (`apps/web/src/stores/queueStore.ts`)
- Manages WebSocket connection state separately from React Query
- Tracks presence by project for collaboration awareness
- Stores last event for debugging/state inspection

### 2. WebSocket Hook (`apps/web/src/hooks/useWebSocket.ts`)
- `useQueueWebSocket(projectId?)` - establishes WebSocket connection
- Auto-reconnects with exponential backoff (max 5 attempts)
- Handles queue events: task_assigned, task_unavailable, task_status_changed, presence_update
- Sends presence heartbeat every 30s when viewing a project
- Invalidates React Query cache on relevant events

### 3. Real-time Queue Hook (`apps/web/src/hooks/useQueue.ts`)
- `useQueueWithRealtime()` - combines queue data fetching with WebSocket
- Returns `wsConnected` status for UI indicator

### 4. Presence Indicator (`apps/web/src/components/queue/PresenceIndicator.tsx`)
- Shows avatar stack of active users on a project
- Uses Tooltip for user names on hover
- Overflow indicator for 5+ users

### 5. Task Detail Page (`apps/web/src/pages/TaskDetailPage.tsx`)
- Route: `/tasks/:taskId`
- Displays task info: ID, status, priority, created date
- Shows assignment details: step, status, assigned date
- Renders input data as formatted JSON
- Shows workflow progress with step states
- Link to annotation page for accepted tasks

### 6. Queue Page Enhancements
- Uses `useQueueWithRealtime` for live updates
- WebSocket connection indicator (Wifi/WifiOff icon)
- Passes project filter to WebSocket for presence

## Files Created/Modified

| File | Action |
|------|--------|
| `apps/web/src/stores/queueStore.ts` | Created |
| `apps/web/src/hooks/useWebSocket.ts` | Created |
| `apps/web/src/hooks/useQueue.ts` | Modified (added useQueueWithRealtime) |
| `apps/web/src/hooks/index.ts` | Modified (export useWebSocket) |
| `apps/web/src/components/queue/PresenceIndicator.tsx` | Created |
| `apps/web/src/components/queue/index.ts` | Modified (export PresenceIndicator) |
| `apps/web/src/pages/TaskDetailPage.tsx` | Created |
| `apps/web/src/pages/QueuePage.tsx` | Modified (real-time hook, WS indicator) |
| `apps/web/src/App.tsx` | Modified (TaskDetailPage route) |

## Verification

```bash
cd apps/web && pnpm build  # ✓ Passes
cargo check --workspace    # ✓ Passes
```

## Architecture Notes

**WebSocket + React Query pattern:**
- WebSocket provides push notifications for real-time events
- React Query manages actual data fetching and caching  
- WS events trigger query invalidation rather than direct state updates
- This gives us optimistic UI while maintaining cache consistency

**Presence system:**
- Heartbeat-based (30s interval)
- Server-side tracks last_seen_at and cleans up stale presence
- UI shows active users per project for collaboration awareness
