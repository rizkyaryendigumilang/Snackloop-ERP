# Apple Design System & Fluid Motion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform SnackLoop ERP's user interface and motion system into a fluid, tactile, Apple-style experience based on WWDC Design principles (spring physics, interruptibility, direct touch tracking, rubber-banding, translucent frosted glass, optical typography, and multimodal haptics) while preserving all existing ERP business functionality and test suites.

**Architecture:** Implement a lightweight mathematical motion utility in `03-ui-utils.js` (Apple spring, rubberband, and momentum projection), wrap mobile modals in `05-modals.js` with direct touch tracking and velocity dismiss, enhance `style.css` with Apple materials (`backdrop-filter: blur(20px) saturate(180%)`), optical tracking typography, and instant press-down feedback, and verify via automated unit tests in `scripts/test.js`.

**Tech Stack:** Native Web Platform (CSS Custom Properties, Pointer Events, Compositor GPU layers, Web Vibration API, Vanilla JS Modular Architecture).

**Spec:** WWDC Design Talks: *Designing Fluid Interfaces* (2018), *The Details of UI Typography* (2020), and *Principles of Great Design* (2026).

## Global Constraints

- Zero regression on existing 15 automated test suites.
- Preserve 100% of ERP business logic, currency calculations, invoice consolidation, and Supabase RPC authentication.
- Strict adherence to `prefers-reduced-motion: reduce` (cross-fade instead of springs) and `prefers-reduced-transparency: reduce` (opaque backgrounds).
- Animate only compositor-friendly properties (`transform`, `opacity`) without triggering layout reflows.

## Review Focus

1. **Spring & Rubberband Formula Accuracy:** The rubberband function must use `(overshoot * dim * 0.55) / (dim + 0.55 * abs(overshoot))` and momentum projection must use `(v / 1000) * d / (1 - d)`.
2. **Instant Touch Feedback:** Interactive controls must register visual press state immediately on `active` with `scale(0.97)` without waiting for pointer release.
3. **Accessibility Fallbacks:** High contrast and reduced motion modes must completely disable elastic overshoot and heavy blur filters.
4. **Namespace Safety:** All Apple motion math utilities must be cleanly exposed under `window.SnackLoop.AppleMotion`.
5. **No Style Collisions:** Frosted glass materials must provide both light-mode and dark-mode contrast legibility without washed-out text.

---

### Task 1: Audit & Prototype Design Specification (Phases 1 & 2)

**Files:**
- Create: `docs/apple-design-audit.md`

- [x] **Step 1:** Document the 16 Apple Design principles audit against SnackLoop ERP current UI.
- [x] **Step 2:** Formulate concrete requirements for fluid bottom sheets, translucent chrome, and tactile feedback.

---

### Task 2: Core Apple Motion Physics Engine & Utilities (Phase 3)

**Files:**
- Modify: `src/modules/03-ui-utils.js`
- Test: `scripts/test.js`

- [x] **Step 1:** Add test in `scripts/test.js` validating `rubberband`, `projectMomentum`, `springStep`, and `triggerHaptic`.
- [x] **Step 2:** Run `npm test` and verify failure.
- [x] **Step 3:** Implement `rubberband`, `projectMomentum`, `springStep`, and `triggerHaptic` inside `src/modules/03-ui-utils.js`.
- [x] **Step 4:** Expose them under `window.SnackLoop.AppleMotion`.
- [x] **Step 5:** Run `npm test` and verify pass.

---

### Task 3: Apple Style Materials, Optical Typography & CSS Tokens (Phase 4a)

**Files:**
- Modify: `style.css`

- [x] **Step 1:** Add Apple Spring timing curves (`--ease-apple-spring: cubic-bezier(0.16, 1, 0.3, 1)` and `--ease-apple-bounce: cubic-bezier(0.34, 1.56, 0.64, 1)`).
- [x] **Step 2:** Add Apple Translucent Frosted Glass tokens (`.apple-glass`, `.apple-header`, `.apple-sheet`).
- [x] **Step 3:** Add Optical Typography classes (`.apple-display`, `.apple-caption-mono`).
- [x] **Step 4:** Add Instant Pointer-down tactile press rules (`button:active`, `.apple-press:active`).
- [x] **Step 5:** Add `prefers-reduced-transparency` and `prefers-contrast` accessibility blocks.

---

### Task 4: Fluid Direct-Manipulation Sheet in Modals (Phase 4b)

**Files:**
- Modify: `src/modules/05-modals.js`
- Modify: `index.html`

- [x] **Step 1:** Add mobile bottom sheet drag handle and velocity-aware swipe dismissal in `src/modules/05-modals.js`.
- [x] **Step 2:** Apply `.apple-header` frosted glass treatment to the main dashboard header in `index.html`.
- [x] **Step 3:** Reassemble bundle with `npm run bundle` and rebuild dist with `npm run build`.

---

### Task 5: End-to-End Verification & CI/CD Pipeline Sync

**Files:**
- Modify: `scripts/test.js`

- [x] **Step 1:** Run complete 16/16 automated test suites with `npm test`.
- [x] **Step 2:** Validate generated `dist/` assets with `node scripts/validate-assets.js dist`.
- [ ] **Step 3:** Git commit and push to `main` with live CI/CD monitoring.
