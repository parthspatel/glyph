/**
 * Hook for warning users about unsaved changes.
 * Handles browser close/refresh with beforeunload event.
 *
 * Note: Client-side navigation blocking requires a data router (createBrowserRouter).
 * This implementation uses beforeunload for browser-level protection and provides
 * a simplified interface for components to track dirty state.
 */

import { useEffect, useRef } from "react";

interface UseUnsavedChangesOptions {
  /**
   * Whether to show the warning. Typically tied to form dirty state.
   */
  isDirty: boolean;
  /**
   * Whether the hook is enabled. Allows conditional activation.
   * @default true
   */
  enabled?: boolean;
  /**
   * Custom message for the confirmation dialog.
   * Note: Modern browsers may ignore custom messages for security reasons.
   * @default 'You have unsaved changes. Are you sure you want to leave?'
   */
  message?: string;
}

interface UseUnsavedChangesReturn {
  /**
   * Current dirty state.
   */
  isDirty: boolean;
}

/**
 * Prevents accidental loss of unsaved changes by warning users
 * when they try to close/refresh the browser.
 *
 * @example
 * ```tsx
 * function EditForm() {
 *   const { isDirty } = useForm();
 *   useUnsavedChanges({ isDirty });
 *
 *   return <form>...</form>;
 * }
 * ```
 */
export function useUnsavedChanges({
  isDirty,
  enabled = true,
  message = "You have unsaved changes. Are you sure you want to leave?",
}: UseUnsavedChangesOptions): UseUnsavedChangesReturn {
  // Use ref to avoid stale closure in event handler
  const isDirtyRef = useRef(isDirty);
  isDirtyRef.current = isDirty;

  const messageRef = useRef(message);
  messageRef.current = message;

  // Handle browser close/refresh with beforeunload event
  useEffect(() => {
    if (!enabled) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirtyRef.current) {
        // Standard way to trigger the browser's confirmation dialog
        e.preventDefault();
        // For older browsers
        e.returnValue = messageRef.current;
        return messageRef.current;
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [enabled]);

  return {
    isDirty,
  };
}

/**
 * Simplified hook that just returns isDirty status.
 * Useful when you only need to track if form has changes.
 */
export function useFormDirtyState(formIsDirty: boolean) {
  return useUnsavedChanges({ isDirty: formIsDirty });
}
