---
name: clean-comments
description: Enforces clean, minimal, non-bulky comments across the codebase without decorative ASCII dividers.
---

# Clean Comments Standard

## Core Rule
**Never write bulky comment banners, ASCII divider lines, or multi-line dashes in code files.**

### Prohibited Patterns:
```ts
// ---------------------------------------------------------------------------
// Section Name
// ---------------------------------------------------------------------------

/* ==========================================
   Header
   ========================================== */

// ******************************************
// Divider
// ******************************************
```

### Allowed Patterns:
- Simple, concise single-line comments when explanation is necessary:
  ```ts
  // Load character frame map definitions
  ```
- Standard JSDoc / TSDoc / Rust doc comments for exported APIs and types:
  ```ts
  /** Animation state machine for sprite rendering. */
  ```
- Clean blank lines between sections instead of visual dividers.
