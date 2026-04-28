# Coding Conventions

**Analysis Date:** 2026-04-28

## Naming Patterns

**Files:**
- Components: PascalCase (e.g., `HorizonIndicator.tsx`, `CompositionOverlay.tsx`)
- Hooks: camelCase with `use` prefix (e.g., `useLighting.ts`, `useAutoCapture.ts`)
- Pure functions/utilities: camelCase (e.g., `types.ts`, `math.ts`)
- Test files: Same name as source + `.test.ts` or `.test.tsx` (e.g., `scoring.test.ts`)
- Mocks: Match package name exactly (e.g., `react-native-mmkv.ts`)

**Functions:**
- React hooks: `use` prefix + PascalCase descriptor (e.g., `useLighting`, `useAutoCapture`)
- Pure functions: camelCase, descriptive verbs (e.g., `computeScore`, `classifyLighting`)
- Event handlers: `handle` prefix (e.g., `handleFrameStats`)
- Boolean checks: `is` or `can` prefix (e.g., `isLevel`, `canStartAutoCapture`)

**Variables:**
- Constants: UPPER_SNAKE_CASE for true constants (e.g., `DEFAULT_RULES_WEIGHTS`, `MAX_ROLL_DEVIATION`)
- Types/Interfaces: PascalCase with descriptive names (e.g., `ScoreSignals`, `LightingThresholds`)
- Private class members: Single underscore prefix (not used in codebase - prefer `private` keyword)
- Refs: Descriptive name + `Ref` suffix (e.g., `intervalRef`, `countdownRef`)

**Types:**
- Interfaces over type aliases for object shapes
- Export types explicitly from barrel files
- Use `type` keyword for imports to avoid circular dependencies: `import type { Foo } from "..."`

## Code Style

**Formatting:**
- Tool: Prettier 2.8.8
- Key settings:
  - `singleQuote: true`
  - `trailingComma: "all"`
  - `arrowParens: "avoid"`
- Indent: Tabs (observed in most files)

**Linting:**
- Tool: ESLint with `@react-native` config
- Configuration: Minimal - extends only `@react-native`
- Location: `.eslintrc.js`

**TypeScript:**
- Version: 5.8.3
- Config extends: `@react-native/typescript-config`
- Strict mode enabled via parent config
- Jest types included: `"types": ["jest"]`
- Exclude mocks from compilation: `"exclude": ["**/node_modules", "**/Pods", "**/__mocks__/**"]`

## Import Organization

**Order:**
1. External dependencies (React, React Native)
2. Type-only imports: `import type { ... } from "..."`
3. Internal module imports (relative paths)
4. Hooks and utilities from feature modules

**Examples from codebase:**
```typescript
// 1. External
import type React from "react";
import { StyleSheet, View } from "react-native";

// 2. Type imports
import type { FaceFramingGuidance } from "../faceDetection/types";

// 3. Internal modules
import { useLighting } from "../lighting";
```

**Path Aliases:**
- Not configured - use relative imports
- Pattern: `../src/module/file` for tests, `../relative/path` for source

**Barrel Files:**
- Every feature module has an `index.ts` barrel file
- Pattern: Re-export all public APIs
- Export types separately from values for tree-shaking:
```typescript
export type { ScoreRingProps } from "./ScoreRing";
export { ScoreRing } from "./ScoreRing";
```

## Error Handling

**Patterns:**
- Use early returns with guard clauses (Tidy First principle)
- Try/catch for async operations with meaningful error messages
- Log warnings for non-fatal errors (e.g., photo deletion failures)
- Re-throw errors for caller handling in critical paths

**Example from codebase:**
```typescript
if (!savedAsset?.node?.id) {
  throw new Error("Failed to save photo to camera roll");
}

// Non-fatal error - log and continue
try {
  await CameraRoll.deletePhotos([photoToDelete.photoId]);
} catch (error) {
  console.warn("Failed to delete photo from camera roll:", error);
}

// Parse errors with fallback
private getStoredMetadata(): PhotoMetadata[] {
  const json = storage.getString(METADATA_KEY);
  if (!json) return [];
  try {
    return JSON.parse(json) as PhotoMetadata[];
  } catch {
    console.error("Failed to parse photo metadata from storage");
    return [];
  }
}
```

## Logging

**Framework:** console

**Patterns:**
- `console.error` for critical failures (data parsing, storage corruption)
- `console.warn` for non-fatal issues (photo deletion failures, API errors)
- No debug/info logging in production code
- Use telemetry module for analytics/tracking (not console)

## Comments

**When to Comment:**
- JSDoc for all exported functions and types
- Explain "why" not "what" for complex logic
- Document algorithm choices and thresholds
- Comment priority ordering (e.g., coaching prompt priorities)

**JSDoc/TSDoc:**
- Required for all exported functions
- Use `@param`, `@returns` tags
- Include units in parameter descriptions (degrees, milliseconds, percentage)

**Example:**
```typescript
/**
 * Compute level subscore (0-100)
 * @param isLevel - Whether currently level
 * @param rollDeviation - Absolute roll deviation in degrees
 * @returns Score 0-100
 */
export function computeLevelScore(
  isLevel: boolean,
  rollDeviation: number,
): number { ... }
```

## Function Design

**Size:**
- Keep functions under 50 lines when possible
- Extract complex calculations to pure utility functions
- Single responsibility principle

**Parameters:**
- Use config objects for 3+ parameters
- Destructure in function signature for clarity
- Provide sensible defaults

**Example:**
```typescript
export function useAutoCapture({
  enabled,
  score,
  isStable,
  autoCaptureThreshold,
  countdownDuration = DEFAULT_COUNTDOWN_DURATION,
}: UseAutoCaptureProps): UseAutoCaptureResult { ... }
```

**Return Values:**
- Return objects for hooks (multiple values)
- Use discriminated unions for state types (e.g., `CountdownState: "idle" | "counting" | "capturing"`)
- Return `null` instead of `undefined` for "no value" semantics

## Module Design

**Exports:**
- Barrel files (`index.ts`) re-export all public APIs
- Separate type exports from value exports
- Export constants alongside related functions

**Barrel File Pattern:**
```typescript
// src/feature/index.ts
/**
 * Feature module description
 */

// Types
export type { TypeA, TypeB } from "./types";

// Components
export { ComponentName, type ComponentProps } from "./ComponentFile";

// Hooks
export { useHookName, type UseHookNameProps } from "./useHookName";

// Pure functions
export { functionA, functionB, CONSTANT_VALUE } from "./types";
```

**Feature Module Structure:**
```
src/feature/
  ├── types.ts        # All types, interfaces, pure functions
  ├── useFeature.ts   # React hook
  ├── Component.tsx   # UI component (if applicable)
  └── index.ts        # Barrel file
```

## React Native Specific Conventions

**Styling:**
- Use `StyleSheet.create` for all styles
- Use `StyleSheet.absoluteFill` (not `absoluteFillObject`)
- Percentage-based positioning for responsive layouts: `marginTop: "33.33%"`
- z-index layering documented in AGENTS.md:
  - camera (0) < composition overlay (10) < face overlay (12) < horizon (15) < prompt pill (25) < header (20) < score ring (30)

**Pointer Events:**
- Overlays use `pointerEvents="none"` to allow touch-through

**Platform-specific:**
- Use `Platform.OS === "ios" ? PERMISSIONS.IOS.CAMERA : PERMISSIONS.ANDROID.CAMERA`
- Never use `||` operator for platform checks

## Performance Conventions

**Timeouts:**
- Type: `ReturnType<typeof setTimeout>` instead of `NodeJS.Timeout`
- Clean up in `useEffect` return
- Store in refs for access in callbacks

**RxJS (Sensors):**
- Use `.unsubscribe()` (not `.remove()`)
- Store subscription in ref for cleanup

**Frame Processing:**
- Always wrap in `try/finally` to ensure `frame.dispose()`
- Target: 33ms/frame on mid-range devices
- Use worklet callbacks with `'worklet'` directive

**Debouncing:**
- Immediate first prompt, immediate clear to null
- 500ms rate-limit between changes

---

*Convention analysis: 2026-04-28*
