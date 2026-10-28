---
name: motion-ui
description: Design, implement, and audit enterprise-grade Motion UI, micro-interactions, smooth physics-based transitions, and accessible fluid animations. Use when crafting interactive UI components, page transitions, tactile feedback, hover states, and dynamic visual motion.
---

# Motion UI Skill & Engineering Standards

This skill governs the craftsmanship, choreography, and technical implementation of fluid animations, micro-interactions, layout transitions, and tactile feedback across Leadsy.

---

## 1. Core Principles of Enterprise Motion Design

1. **Purpose-Driven, Never Gratuitous:**
   - Every animation must clarify state changes, establish spatial relationships, or provide immediate sensory feedback to user actions.
   - Never animate for decoration alone. Animations should feel crisp, snappy, and functional.

2. **Snappy & High Performance (60–120 FPS):**
   - **Micro-interactions (button click, toggle, hover):** 100ms – 180ms.
   - **Component transitions (modals, dropdowns, popovers, toast alerts):** 200ms – 280ms.
   - **Page & View transitions (tabs, perspective shifts, drawers):** 300ms – 400ms.
   - **Never block user interaction:** All interactive elements must remain clickable and responsive during animations.

3. **Physics-Based Natural Easing:**
   - Avoid generic `linear` or standard `ease-in-out` transitions.
   - Use exponential deceleration / Apple & Raycast standard cubic bezier:
     ```css
     /* Smooth Enterprise Deceleration (Enter) */
     --ease-out-quint: cubic-bezier(0.16, 1, 0.3, 1);
     /* Snappy Spring-like Elasticity */
     --ease-spring: cubic-bezier(0.175, 0.885, 0.32, 1.275);
     /* Fluid Micro Ease */
     --ease-smooth: cubic-bezier(0.4, 0, 0.2, 1);
     ```

4. **Zero Layout Shift (CLS = 0):**
   - Animate ONLY composite properties (`transform`, `opacity`, `filter`).
   - NEVER animate `width`, `height`, `top`, `left`, `margin`, or `padding` directly during high-frequency animations as they trigger costly browser layout reflows. Use `scaleX`, `scaleY`, and `translate3d(x, y, z)` instead.

5. **Accessibility & Reduced Motion:**
   - Always respect `@media (prefers-reduced-motion: reduce)`.
   - Provide clean, instant fallback without visual jar when reduced motion is preferred by the operating system.

---

## 2. Standard Motion Design Tokens & CSS Utilities

Ensure components use standardized motion utility classes:

```css
/* Motion Durations */
--duration-fast: 150ms;
--duration-normal: 250ms;
--duration-slow: 400ms;

/* Transform Presets */
.motion-hover-lift {
  transition: transform var(--duration-fast) var(--ease-out-quint),
              box-shadow var(--duration-fast) var(--ease-out-quint);
}
.motion-hover-lift:hover {
  transform: translateY(-2px);
}

.motion-press-active:active {
  transform: scale(0.98);
}

.motion-fade-in {
  animation: fadeIn var(--duration-normal) var(--ease-out-quint) forwards;
}

.motion-slide-up {
  animation: slideUp var(--duration-normal) var(--ease-out-quint) forwards;
}
```

---

## 3. Micro-Interaction Choreography Checklist

When creating or refining components:
- [ ] **Buttons & Interactive Badges:** Subtle hover lift (`translateY(-1px)`), slight glow or border brightness increase, tactile press depression (`scale(0.98)`).
- [ ] **Modals & Dialogs:** Smooth scale-up from `scale(0.96)` to `scale(1.0)` with opacity fade in `200ms` using `--ease-out-quint`.
- [ ] **Tabs & Switchers:** Active pill indicator slides horizontally or fades seamlessly with active highlight.
- [ ] **Cards & Bento Grids:** Subtle gradient border illumination upon hover, icon subtle scale, depth shadow expansion.
- [ ] **Loaders & Shimmers:** Smooth shimmering gradients with hardware-accelerated infinite translate.
- [ ] **Toast Notifications:** Slide-in from top/bottom with spring bounce, progress decay bar, smooth dismiss.

---

## 4. Anti-Patterns to Strictly Avoid

- ❌ Never use animation durations exceeding `500ms` for common user interface actions.
- ❌ Never animate elements on scroll in a way that hides content before the user scrolls to it.
- ❌ Do not use aggressive spin or strobe animations.
- ❌ Do not animate layout width/height on large data tables.
- ❌ Avoid inline CSS `style={{ transition: 'all 1s' }}`. Always use defined Tailwind or CSS design tokens.
