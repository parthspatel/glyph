# Plan 09-06 Summary: Instructions & Shortcuts

## Overview

Created instructions panel and keyboard shortcuts cheatsheet modal.

## Deliverables

| Deliverable | Status |
|-------------|--------|
| react-collapsed and react-hotkeys-hook installed | ✅ |
| InstructionsPanel component | ✅ |
| ShortcutsModal component | ✅ |
| Keyboard shortcuts integration | ✅ |

## Commits

| Commit | Description | Files |
|--------|-------------|-------|
| f4b944b | feat(09-06): add react-collapsed and create InstructionsPanel | 2 files |
| 8181e48 | feat(09-06): create ShortcutsModal and integrate keyboard shortcuts | 1 file |

## Technical Details

### InstructionsPanel Component
- Uses react-collapsed for smooth expand/collapse animation
- Clickable header with FileText icon
- Renders HTML instructions with prose styling
- Returns null if no instructions provided

### ShortcutsModal Component
- Three shortcut groups: General, Navigation, Text Selection (NER)
- Styled kbd elements for key combinations
- Escape key closes modal
- Footer reminder about ? key

### Keyboard Shortcuts
- `?` - Open shortcuts modal
- `Ctrl+Enter` / `Cmd+Enter` - Submit annotation
- `Ctrl+S` / `Cmd+S` - Save draft (prevents browser save dialog)
- `Escape` - Close modals

### AnnotatePage Integration
- useHotkeys from react-hotkeys-hook
- InstructionsPanel below toolbar, starts expanded
- ShortcutsModal renders on demand
- Instructions button toggles panel expand/collapse

## Verification

- [x] Instructions panel shows and expands/collapses
- [x] Pressing ? opens shortcuts modal
- [x] Modal shows grouped shortcuts
- [x] Ctrl+Enter triggers submit
- [x] Ctrl+S triggers save
- [x] Escape closes modals

## Notes

Default shortcuts are hardcoded. Dynamic shortcuts from layout-runtime's ShortcutRegistry can be integrated when layouts define custom shortcuts.
