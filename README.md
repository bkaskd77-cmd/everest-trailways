# Everest Trailways

Booking site for guided treks and outdoor activities in Nepal, sold to
international travellers. Positioning: **"The Himalaya, made verifiable."**

> **Status — Step 1 of 10.** Foundation only: design tokens, motion primitives,
> app shell, and the deployment pipeline. The home page is a disposable
> placeholder that renders the design system for review; Step 2 replaces it.

## Run it

```bash
pnpm install && pnpm dev
```

## Stack

| Concern    | Choice                                                       |
| ---------- | ------------------------------------------------------------ |
| Framework  | Next.js 16 (App Router, TypeScript strict)                   |
| Styling    | Tailwind CSS v4 — CSS-first `@theme`, no JS config           |
| Motion     | `motion` (successor to framer-motion)                        |
| Primitives | shadcn/ui — button, sheet, dialog, dropdown, badge, skeleton |
| Icons      | lucide-react                                                 |
| Fonts      | Instrument Serif (display) + Inter (body), `next/font`       |
| Hosting    | Vercel                                                       |

## Layout

```
src/
  app/          routes, root layout, error + not-found
  components/
    ui/         shadcn primitives
    layout/     header, footer, nav, wordmark, theme toggle
    motion/     Reveal, StaggerGroup, TextReveal, Parallax, MagneticButton
    design-system/  Step 1 specimens — deleted in Step 2
  lib/          motion tokens, site config, cn()
  styles/       globals.css — the entire token layer
```

## Design system

All tokens live in [`src/styles/globals.css`](src/styles/globals.css), in three
passes: brand primitives → semantic aliases (which flip with the theme) →
`@theme inline` mapping. Components reference the semantic names only.

Motion shares one easing curve (`EASE`, expo-out) and three durations, defined
once in [`src/lib/motion.ts`](src/lib/motion.ts) and mirrored in CSS as
`--ease-house`.

**Reduced motion** is handled in CSS rather than by branching in React: every
primitive tags its animated element with `data-motion`, and a
`prefers-reduced-motion` block pins those to their resting state with
`!important`, which outranks the inline styles Motion writes. Server and client
markup stay identical, so hydration stays clean.

## Scripts

| Command             | Does                     |
| ------------------- | ------------------------ |
| `pnpm dev`          | Dev server on :3000      |
| `pnpm build`        | Production build         |
| `pnpm lint`         | ESLint                   |
| `pnpm typecheck`    | `tsc --noEmit`           |
| `pnpm format`       | Prettier write           |
| `pnpm format:check` | Prettier check (CI gate) |

CI runs all four checks on every push and pull request; Vercel builds a preview
deployment per branch and promotes `main` to production.
