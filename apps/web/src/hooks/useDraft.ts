/**
 * useDraft - Auto-save hook for annotation drafts.
 *
 * Automatically saves drafts after a debounce period.
 * Loads existing drafts on mount.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useDebouncedCallback } from "use-debounce";
import { draftsApi } from "../api/drafts";
import type { SaveStatusState } from "../components/annotation/SaveStatus";

const DEBOUNCE_MS = 1500;

interface UseDraftOptions {
  taskId: string | undefined;
  /** Called when draft is loaded, to initialize output state */
  onLoad?: (data: Record<string, unknown>) => void;
}

interface UseDraftReturn {
  /** Current save status */
  saveStatus: SaveStatusState;
  /** Trigger a save (debounced) */
  save: (data: Record<string, unknown>) => void;
  /** Clear/delete the draft */
  clear: () => Promise<void>;
  /** Whether initial draft load is in progress */
  isLoading: boolean;
  /** The loaded draft data */
  draftData: Record<string, unknown> | null;
}

export function useDraft({ taskId, onLoad }: UseDraftOptions): UseDraftReturn {
  const queryClient = useQueryClient();
  const [saveStatus, setSaveStatus] = useState<SaveStatusState>("idle");
  const abortControllerRef = useRef<AbortController | null>(null);
  const onLoadRef = useRef(onLoad);
  onLoadRef.current = onLoad;

  // Query key for draft
  const draftKey = ["draft", taskId] as const;

  // Load existing draft on mount
  const { data: draft, isLoading } = useQuery({
    queryKey: draftKey,
    queryFn: () => draftsApi.getDraft(taskId!),
    enabled: !!taskId,
    staleTime: Infinity, // Don't refetch automatically
    retry: false,
  });

  // Call onLoad when draft is loaded
  useEffect(() => {
    if (draft?.data && onLoadRef.current) {
      onLoadRef.current(draft.data);
      setSaveStatus({ saved: new Date(draft.updated_at) });
    }
  }, [draft]);

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      // Cancel any in-flight request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();

      setSaveStatus({ saving: true });
      return draftsApi.saveDraft(taskId!, data);
    },
    onSuccess: (savedDraft) => {
      setSaveStatus({ saved: new Date(savedDraft.updated_at) });
      queryClient.setQueryData(draftKey, savedDraft);
    },
    onError: (error) => {
      // Don't show error for aborted requests
      if (error instanceof Error && error.name === "AbortError") {
        return;
      }
      setSaveStatus({
        error: error instanceof Error ? error.message : "Save failed",
      });
    },
  });

  // Debounced save function
  const debouncedSave = useDebouncedCallback(
    (data: Record<string, unknown>) => {
      if (taskId) {
        saveMutation.mutate(data);
      }
    },
    DEBOUNCE_MS,
  );

  // Public save function - sets pending and triggers debounced save
  const save = useCallback(
    (data: Record<string, unknown>) => {
      setSaveStatus("pending");
      debouncedSave(data);
    },
    [debouncedSave],
  );

  // Delete draft
  const deleteMutation = useMutation({
    mutationFn: () => draftsApi.deleteDraft(taskId!),
    onSuccess: () => {
      setSaveStatus("idle");
      queryClient.removeQueries({ queryKey: draftKey });
    },
  });

  const clear = useCallback(async () => {
    if (taskId) {
      await deleteMutation.mutateAsync();
    }
  }, [taskId, deleteMutation]);

  return {
    saveStatus,
    save,
    clear,
    isLoading,
    draftData: draft?.data ?? null,
  };
}
