/**
 * ShortcutsModal - Keyboard shortcuts cheatsheet.
 *
 * Shows available shortcuts grouped by context.
 */

import React from "react";
import { Keyboard, X } from "lucide-react";

interface ShortcutsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ShortcutItem {
  keys: string;
  description: string;
}

interface ShortcutGroup {
  title: string;
  shortcuts: ShortcutItem[];
}

// Default shortcuts available in annotation interface
const SHORTCUT_GROUPS: ShortcutGroup[] = [
  {
    title: "General",
    shortcuts: [
      { keys: "Ctrl + Enter", description: "Submit annotation" },
      { keys: "Ctrl + S", description: "Save draft" },
      { keys: "Ctrl + Z", description: "Undo" },
      { keys: "Ctrl + Shift + Z", description: "Redo" },
      { keys: "?", description: "Show shortcuts" },
      { keys: "Escape", description: "Close modal / Cancel" },
    ],
  },
  {
    title: "Navigation",
    shortcuts: [
      { keys: "Tab", description: "Next field" },
      { keys: "Shift + Tab", description: "Previous field" },
      { keys: "↑ / ↓", description: "Navigate options" },
      { keys: "Enter", description: "Select option" },
    ],
  },
  {
    title: "Text Selection (NER)",
    shortcuts: [
      { keys: "Click + Drag", description: "Select text span" },
      { keys: "Double Click", description: "Select word" },
      { keys: "Backspace / Delete", description: "Remove selected entity" },
      { keys: "1-9", description: "Quick assign label (if configured)" },
    ],
  },
];

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex min-w-[1.5rem] items-center justify-center rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
      {children}
    </kbd>
  );
}

function formatKeys(keys: string) {
  return keys.split(" + ").map((key, i, arr) => (
    <React.Fragment key={key}>
      <Kbd>{key}</Kbd>
      {i < arr.length - 1 && <span className="mx-0.5 text-muted-foreground">+</span>}
    </React.Fragment>
  ));
}

export function ShortcutsModal({
  open,
  onOpenChange,
}: ShortcutsModalProps): React.ReactElement | null {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={() => onOpenChange(false)}
        aria-hidden="true"
      />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-lg rounded-lg bg-card p-6 shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Keyboard className="h-5 w-5" />
            <h2 className="text-lg font-semibold">Keyboard Shortcuts</h2>
          </div>
          <button
            onClick={() => onOpenChange(false)}
            className="rounded p-1 hover:bg-muted"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Shortcut groups */}
        <div className="mt-6 space-y-6">
          {SHORTCUT_GROUPS.map((group) => (
            <div key={group.title}>
              <h3 className="mb-2 text-sm font-medium text-muted-foreground">
                {group.title}
              </h3>
              <div className="space-y-2">
                {group.shortcuts.map((shortcut) => (
                  <div
                    key={shortcut.keys}
                    className="flex items-center justify-between"
                  >
                    <span className="text-sm">{shortcut.description}</span>
                    <div className="flex items-center">
                      {formatKeys(shortcut.keys)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="mt-6 border-t border-border pt-4 text-center text-xs text-muted-foreground">
          Press <Kbd>?</Kbd> anytime to show this help
        </div>
      </div>
    </div>
  );
}
