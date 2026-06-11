---
trigger: always_on
---

# design-system.md — PrepMate AI

## Overview

PrepMate AI uses a predefined design system implemented through Tailwind CSS design tokens and customised shadcn/ui components. This document is the single source of truth for all visual decisions.

Token values originate from `color-token.json` (colour palettes) and `design-tokens.json` (typography scale), which are compiled to CSS custom properties by `convert-tokens.js` into `tokens.css`. Do not edit `tokens.css` directly — edit the JSON source files and re-run the converter.

**Do not create new brand colours. Do not create new typography scales. Do not deviate from the design tokens defined here.**

All design choices must serve the product's core experience principles: reduce student stress, encourage consistency, and make progress visible and motivating.

---

## Design Principles

| Principle | What It Means in Practice |
|---|---|
| **Clean** | Generous whitespace, no visual clutter, single clear action per screen |
| **Modern** | Rounded corners, subtle shadows, flat UI with purposeful depth |
| **Accessible** | WCAG 2.1 AA contrast minimums, keyboard navigation, ARIA labels |
| **Minimal** | Show only what the student needs right now, progressively disclose the rest |
| **Motivating** | Celebrate progress, use positive visual cues, avoid alarming colours for neutral states |

---

## Colour System

### Semantic Tokens

These are the only colour tokens used in the application. Never reference raw hex values directly in component code — always use the token names via Tailwind classes.

| Token | Tailwind Class | Purpose |
|---|---|---|
| `primary` | `bg-primary`, `text-primary` | Primary actions, key highlights, brand identity |
| `primary-foreground` | `text-primary-foreground` | Text on primary backgrounds |
| `secondary` | `bg-secondary`, `text-secondary` | Secondary actions, supporting UI |
| `secondary-foreground` | `text-secondary-foreground` | Text on secondary backgrounds |
| `accent` | `bg-accent`, `text-accent` | Highlights, tags, badges, streaks |
| `accent-foreground` | `text-accent-foreground` | Text on accent backgrounds |
| `surface` | `bg-surface` | Card and panel backgrounds |
| `background` | `bg-background` | Page background |
| `foreground` | `text-foreground` | Default body text |
| `muted` | `bg-muted`, `text-muted` | Subdued text, disabled states, placeholders |
| `muted-foreground` | `text-muted-foreground` | Text on muted backgrounds |
| `border` | `border-border` | All borders and dividers |
| `destructive` | `bg-destructive`, `text-destructive` | Errors, deletion, critical warnings |
| `destructive-foreground` | `text-destructive-foreground` | Text on destructive backgrounds |
| `success` | `text-success`, `bg-success` | Completed sessions, correct answers |
| `warning` | `text-warning`, `bg-warning` | Missed sessions, approaching deadlines |

### Status Colour Usage

| State | Colour Token | Example |
|---|---|---|
| Complete / Correct | `success` | Session marked done, quiz answer correct |
| Missed / Warning | `warning` | Missed session badge, exam approaching |
| Error / Destructive | `destructive` | Form validation error, delete action |
| Pending / Neutral | `muted` | Upcoming session not yet started |

### Tailwind Config (Reference)

```js
// tailwind.config.ts
module.exports = {
  theme: {
    extend: {
      colors: {
        primary: { DEFAULT: "hsl(var(--primary))", foreground: "hsl(var(--primary-foreground))" },
        secondary: { DEFAULT: "hsl(var(--secondary))", foreground: "hsl(var(--secondary-foreground))" },
        accent: { DEFAULT: "hsl(var(--accent))", foreground: "hsl(var(--accent-foreground))" },
        surface: "hsl(var(--surface))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        muted: { DEFAULT: "hsl(var(--muted))", foreground: "hsl(var(--muted-foreground))" },
        border: "hsl(var(--border))",
        destructive: { DEFAULT: "hsl(var(--destructive))", foreground: "hsl(var(--destructive-foreground))" },
        success: "hsl(var(--success))",
        warning: "hsl(var(--warning))",
      },
    },
  },
};
```

### Dark Mode

Dark mode uses the `.dark` class strategy (not `prefers-color-scheme`). Toggle by adding/removing the `dark` class on `<html>`. The `color-token.json` defines all dark role values under `color.role.dark`.

```css
/* app/globals.css */
:root {
  --primary: 231 78% 58%;
  --surface: 220 10% 98%;
  /* ... light mode values from color-token.json */
}

.dark {
  --primary: 231 78% 58%;
  --surface: 220 10% 50%;
  /* ... dark mode values from color-token.json */
}
```

```js
// tailwind.config.ts
module.exports = {
  darkMode: "class",
  // ...
};
```

Components do not need theme-aware class changes. The CSS variables swap automatically when `.dark` is applied. Always verify both modes in development.

---

## Typography System

### Font Family

Primary font is **Manrope** (500 weight for headings, 400 for body). It is loaded via `next/font`:

```ts
// lib/fonts.ts
import { Manrope } from "next/font/google";

export const manrope = Manrope({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-manrope",
});
```

```js
// tailwind.config.ts
module.exports = {
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-manrope)", "system-ui", "sans-serif"],
      },
    },
  },
};
```

Monospace: system mono stack via Tailwind `font-mono` (code only).

### Scale

| Token | Tailwind Class | Size | Weight | Usage |
|---|---|---|---|---|
| `display-large` | `text-display-large` | 58px | 500 | Landing page hero, welcome screen |
| `display-medium` | `text-display-medium` | 48px | 500 | Page hero headings |
| `display-small` | `text-display-small` | 40px | 500 | Section hero headings |
| `headline-large` | `text-headline-large` | 38px | 500 | Page titles |
| `headline-medium` | `text-headline-medium` | 32px | 500 | Section headings |
| `headline-small` | `text-headline-small` | 24px | 500 | Card titles, sub-sections |
| `title-large` | `text-title-large` | 24px | 500 | Card titles (can pair with headline-small) |
| `title-medium` | `text-title-medium` | 16px | 500 | Label headings, navigation |
| `title-small` | `text-title-small` | 14px | 500 | Sub-labels, metadata headings |
| `body-large` | `text-body-large` | 20px | 400 | Lead body copy, descriptions |
| `body-medium` | `text-body-medium` | 16px | 400 | Default body copy |
| `body-small` | `text-body-small` | 14px | 400 | Secondary text, descriptions |
| `label-large` | `text-label-large` | 16px | 400 | Form labels, list headers |
| `label-medium` | `text-label-medium` | 14px | 400 | Input labels |
| `label-small` | `text-label-small` | 12px | 400 | Timestamps, metadata |
| `code` | `font-mono text-sm` | 14px | 400 | Inline code only |

These classes are defined in `tokens.css` under the `--font-*` and `--typography-*` custom properties. The corresponding Tailwind config maps them as:

```js
// tailwind.config.ts
module.exports = {
  theme: {
    extend: {
      fontSize: {
        "display-large": ["58px", { lineHeight: "87px", letterSpacing: "-1.74px" }],
        "display-medium": ["48px", { lineHeight: "72px", letterSpacing: "-0.96px" }],
        "display-small":  ["40px", { lineHeight: "64px", letterSpacing: "-0.8px" }],
        "headline-large": ["38px", { lineHeight: "64.6px", letterSpacing: "-0.76px" }],
        "headline-medium":["32px", { lineHeight: "54.4px", letterSpacing: "-0.64px" }],
        "headline-small": ["24px", { lineHeight: "40.8px", letterSpacing: "-0.48px" }],
        "title-large":    ["24px", { lineHeight: "40.8px", letterSpacing: "-0.48px" }],
        "title-medium":   ["16px", { lineHeight: "27.2px", letterSpacing: "-0.32px" }],
        "title-small":    ["14px", { lineHeight: "27.2px", letterSpacing: "-0.28px" }],
        "body-large":     ["20px", { lineHeight: "34px", letterSpacing: "0px" }],
        "body-medium":    ["16px", { lineHeight: "27.2px", letterSpacing: "0px" }],
        "body-small":     ["14px", { lineHeight: "23.8px", letterSpacing: "0px" }],
        "label-large":    ["16px", { lineHeight: "27.2px", letterSpacing: "-0.16px" }],
        "label-medium":   ["14px", { lineHeight: "23.8px", letterSpacing: "-0.14px" }],
        "label-small":    ["12px", { lineHeight: "20.4px", letterSpacing: "-0.12px" }],
      },
    },
  },
};
```

### Usage in Components

Use the Tailwind classes directly. Never set `fontSize` or `fontFamily` inline:

```tsx
// ✅ Correct
<h1 className="text-headline-large text-foreground">Study Plan</h1>
<p className="text-body-medium text-muted-foreground">Your next session is tomorrow.</p>

// ❌ Wrong
<h1 style={{ fontSize: 38, fontFamily: "Manrope" }}>Study Plan</h1>
```

---

## Spacing System

Use Tailwind's default 4px base spacing scale exclusively. Common values:

| Usage | Class |
|---|---|
| Component internal padding | `p-4` (16px) or `p-6` (24px) |
| Card padding | `p-6` |
| Section gap | `gap-6` or `gap-8` |
| Form field gap | `gap-4` |
| Inline icon + text | `gap-2` |
| Page max-width | `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8` |

---

## Border Radius

| Element | Class |
|---|---|
| Cards, panels | `rounded-xl` |
| Buttons | `rounded-lg` |
| Inputs | `rounded-lg` |
| Badges, tags | `rounded-full` |
| Modals | `rounded-2xl` |

---

## Shadows

| Usage | Class |
|---|---|
| Default card | `shadow-sm` |
| Elevated card (hover) | `shadow-md` |
| Modal / overlay | `shadow-xl` |
| No shadow (flat) | `shadow-none` |

---

## Animation & Transitions

| Usage | Class / Rule |
|---|---|
| Hover state transitions | `transition-colors duration-200` |
| Button press feedback | `active:scale-95` (optional, use sparingly) |
| Page / route transitions | Instant (no animation for MVP) |
| Modal open/close | shadcn/ui `Dialog` default animation |
| Skeleton loading | `animate-pulse` from Tailwind |
| Spinner | `animate-spin` on `Loader2` from lucide-react |

Do not add custom animations beyond Tailwind utilities without design review.

---

## Component Guidelines

### Buttons

Five variants. Use shadcn/ui `Button` with the variant prop — never build raw `<button>` elements for interactive actions.

| Variant | When to Use |
|---|---|
| `default` (primary) | Single primary action per screen (e.g., Generate Plan, Submit Quiz) |
| `secondary` | Secondary actions alongside a primary (e.g., Cancel, Back) |
| `outline` | Tertiary actions, less emphasis needed |
| `destructive` | Irreversible actions (delete, remove) |
| `ghost` | Icon buttons, toolbar actions, low-emphasis navigation |

```tsx
<Button variant="default">Generate Study Plan</Button>
<Button variant="outline">Cancel</Button>
<Button variant="destructive">Delete Course</Button>
```

Never use more than one `default` (primary) button in a single view.

### Cards

All content cards use the shadcn/ui `Card` component:

```tsx
<Card className="bg-surface rounded-xl shadow-sm p-6">
  <CardHeader>
    <CardTitle className="text-headline-small">Session Title</CardTitle>
    <CardDescription className="text-body-small text-muted-foreground">
      Description text here
    </CardDescription>
  </CardHeader>
  <CardContent>...</CardContent>
</Card>
```

### Forms

- All form inputs use shadcn/ui `Input`, `Select`, `Textarea`.
- All form labels use the `Label` component.
- Validation errors appear below the field in `text-destructive text-sm`.
- Required fields are marked with an asterisk in the label: `Course Name *`.

```tsx
<div className="flex flex-col gap-4">
  <div className="flex flex-col gap-1.5">
    <Label htmlFor="courseName">Course Name *</Label>
    <Input id="courseName" placeholder="e.g. Human Anatomy" />
    {error && <p className="text-destructive text-sm">{error}</p>}
  </div>
</div>
```

### Progress Indicators

- Use `Progress` from shadcn/ui for completion bars.
- Completion percentage is always shown numerically alongside the bar.
- Colour: use `bg-success` for the filled portion when on track, `bg-warning` when behind schedule.

### Badges / Tags

- Session status badges: use `Badge` from shadcn/ui.
- Map status to colour: `complete → success`, `missed → warning`, `pending → muted`.

```tsx
<Badge variant="outline" className="bg-success/10 text-success border-success/20">
  Complete
</Badge>
```

### Empty States

Every list or data view must have a designed empty state — never show a blank area.

```tsx
<div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
  <BookOpen className="h-10 w-10 text-muted-foreground" />
  <p className="text-title-medium text-foreground">No sessions yet</p>
  <p className="text-body-small text-muted-foreground">
    Generate a study plan to get started.
  </p>
  <Button variant="default">Generate Study Plan</Button>
</div>
```

### Loading States

- Use skeleton loaders (shadcn/ui `Skeleton`) for content that loads asynchronously.
- Use a spinner (`Loader2` from lucide-react with `animate-spin`) for button loading states.
- Never show a blank screen while data loads.

---

## Iconography

- Use **lucide-react** exclusively. Do not mix icon libraries.
- Default icon size: `h-5 w-5` for inline icons, `h-6 w-6` for standalone icons.
- Icons paired with text use `gap-2` and `flex items-center`.
- Decorative icons have `aria-hidden="true"`.

```tsx
import { BookOpen, CheckCircle, Clock } from "lucide-react";

<span className="flex items-center gap-2 text-body-medium">
  <Clock className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
  45 minutes
</span>
```

---

## Layout Patterns

### Page Shell

All dashboard pages share a consistent shell:

```
┌─────────────────────────────────────────┐
│  Sidebar Nav (fixed, left)              │
│  ┌───────────────────────────────────┐  │
│  │  Page Header (title + actions)    │  │
│  ├───────────────────────────────────┤  │
│  │  Page Content (scrollable)        │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

### Responsive Breakpoints

| Breakpoint | Width | Layout Change |
|---|---|---|
| `sm` | 640px | Stack sidebar above content |
| `md` | 768px | Two-column grid for cards |
| `lg` | 1024px | Sidebar visible alongside content |
| `xl` | 1280px | Wider content area, three-column grids |

---

## Accessibility Requirements

- Minimum contrast ratio: **4.5:1** for normal text, **3:1** for large text (WCAG AA).
- All interactive elements are keyboard-focusable with a visible focus ring (Tailwind `focus-visible:ring-2`).
- All images and icons have `alt` text or `aria-hidden="true"` if decorative.
- Form fields are associated with labels via `htmlFor` / `id`.
- Error messages are linked to fields via `aria-describedby`.
- Modal dialogs trap focus and restore focus on close (shadcn/ui `Dialog` handles this).
- Lighthouse Accessibility score target: **90+**.

---

## shadcn/ui Customisation Rules

- Install components via the shadcn/ui CLI: `npx shadcn-ui@latest add [component]`.
- After installation, update the component in `components/ui/` to use the design tokens above (e.g., replace default `blue-600` references with `primary`).
- Do not modify shadcn/ui source files outside of `components/ui/`.
- Document any customisation with an inline comment.
