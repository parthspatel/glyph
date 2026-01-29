/**
 * Hook for warning users about unsaved changes.
 * Handles both browser close/refresh and client-side navigation.
 */

import { useEffect, useRef, useCallback } from 'react';
import { useBlocker } from 'react-router-dom';

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
  /**
   * Whether navigation is currently blocked.
   */
  isBlocked: boolean;
  /**
   * Proceed with navigation despite unsaved changes.
   */
  proceed: () => void;
  /**
   * Cancel navigation and stay on the page.
   */
  stay: () => void;
}

/**
 * Prevents accidental loss of unsaved changes by warning users
 * when they try to leave the page.
 *
 * @example
 * ```tsx
 * function EditForm() {
 *   const { isDirty } = useForm();
 *   const { isBlocked, proceed, stay } = useUnsavedChanges({ isDirty });
 *
 *   return (
 *     <>
 *       <form>...</form>
 *       {isBlocked && (
 *         <ConfirmDialog
 *           onConfirm={proceed}
 *           onCancel={stay}
 *         />
 *       )}
 *     </>
 *   );
 * }
 * ```
 */
export function useUnsavedChanges({
  isDirty,
  enabled = true,
  message = 'You have unsaved changes. Are you sure you want to leave?',
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

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [enabled]);

  // Handle client-side navigation with react-router-dom's useBlocker
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      enabled &&
      isDirty &&
      currentLocation.pathname !== nextLocation.pathname
  );

  // Auto-show confirmation dialog when blocked
  // This provides a fallback UX if the component doesn't render a custom dialog
  useEffect(() => {
    if (blocker.state === 'blocked') {
      // Use native confirm as fallback
      // Component can override this by checking isBlocked and showing custom dialog
      const shouldLeave = window.confirm(messageRef.current);
      if (shouldLeave) {
        blocker.proceed();
      } else {
        blocker.reset();
      }
    }
  }, [blocker]);

  const proceed = useCallback(() => {
    if (blocker.state === 'blocked') {
      blocker.proceed();
    }
  }, [blocker]);

  const stay = useCallback(() => {
    if (blocker.state === 'blocked') {
      blocker.reset();
    }
  }, [blocker]);

  return {
    isDirty,
    isBlocked: blocker.state === 'blocked',
    proceed,
    stay,
  };
}

/**
 * Simplified hook that just returns isDirty status.
 * Useful when you only need to track if form has changes.
 */
export function useFormDirtyState(formIsDirty: boolean) {
  return useUnsavedChanges({ isDirty: formIsDirty });
}
