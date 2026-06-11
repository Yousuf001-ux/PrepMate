---
trigger: always_on
---

# code-style.md — PrepMate AI

## Overview

These conventions apply to all code in the PrepMate AI codebase. Consistency matters: code is read far more often than it is written. Follow these rules when creating new files and when editing existing ones.

---

## Language & Tooling

- **Language**: TypeScript (strict mode). No plain `.js` files. Use `import type { ... }` for type-only imports.
- **Framework**: Next.js 14+ (App Router)
- **Styling**: Tailwind CSS with design token classes only (see `design-system.md`)
- **Components**: shadcn/ui, customised to the design system
- **ORM**: Prisma
- **Linting**: ESLint with the Next.js recommended config
- **Formatting**: Prettier with default settings
- **Package manager**: npm

Run before committing:
```bash
npm run lint
npm run type-check
```

---

## TypeScript

### Strict Mode

`tsconfig.json` must include:
```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["./*"]
    }
  }
}
```

### Types vs Interfaces

- Use `interface` for object shapes (components props, API responses, DB models).
- Use `type` for unions, intersections, and utility types.

```ts
// ✅ Correct
interface StudySession {
  id: string;
  topicId: string;
  scheduledDate: Date;
  durationMinutes: number;
  status: "pending" | "complete" | "missed";
}

type SessionStatus = StudySession["status"];
```

### No `any`

Never use `any`. Use `unknown` when the type is genuinely uncertain, then narrow it:

```ts
// ❌ Wrong
function parseAIResponse(raw: any) { ... }

// ✅ Correct
function parseAIResponse(raw: unknown): StudyPlanOutput {
  if (!isStudyPlanOutput(raw)) throw new Error("Invalid AI response shape");
  return raw;
}
```

### No Suppression Comments

`@ts-ignore` and `@ts-expect-error` are banned. If TypeScript is catching a valid issue, fix the code. If a third-party library has bad types, wrap it in a properly typed module.

### Explicit Return Types on Functions

Always annotate return types on exported functions and async functions:

```ts
export async function generateQuiz(topicId: string): Promise<QuizOutput> { ... }
```

---

## Naming Conventions

| Entity | Convention | Example |
|---|---|---|
| Files (components) | PascalCase | `StudyPlanCard.tsx` |
| Files (utilities, hooks) | camelCase | `useStudyPlan.ts` |
| Files (API routes) | lowercase with hyphens | `study-plans/route.ts` |
| React components | PascalCase | `StudyPlanCard` |
| Variables & functions | camelCase | `generateStudyPlan` |
| Constants | UPPER_SNAKE_CASE | `MAX_DAILY_HOURS` |
| Types & interfaces | PascalCase | `StudyPlanOutput` |
| Prisma models | PascalCase | `StudySession` |
| Database columns | camelCase (Prisma default) | `scheduledDate` |
| Next.js convention files | lowercase | `page.tsx`, `layout.tsx`, `loading.tsx`, `error.tsx`, `route.ts`, `not-found.tsx` |
| CSS class names | Tailwind utility classes only | `text-primary bg-surface` |

---

## File & Folder Structure Rules

- One component per file.
- Co-locate styles and tests with the component only when they are component-specific.
- Place shared logic in `lib/`. Place page-specific logic close to the page.
- Types shared across multiple features go in `types/`.
- Types used only within a single file can be defined in that file.

---

## React & Next.js

### Server vs Client Components

Default to **Server Components**. Add `"use client"` only when the component requires:
- Browser APIs (`window`, `document`)
- React hooks (`useState`, `useEffect`, `useRef`)
- Event listeners

```tsx
// ✅ Server Component (default — no directive needed)
export default async function StudyPlanPage() {
  const sessions = await getStudySessions();
  return <SessionList sessions={sessions} />;
}

// ✅ Client Component (only when necessary)
"use client";

export function QuizCard({ question }: QuizCardProps) {
  const [selected, setSelected] = useState<string | null>(null);
  ...
}
```

### Props

Always define an explicit props interface:

```tsx
interface SessionCardProps {
  session: StudySession;
  onComplete: (id: string) => void;
}

export function SessionCard({ session, onComplete }: SessionCardProps) { ... }
```

### Keys

Use stable, unique IDs as React keys. Never use array index as a key unless the list is static and will never be reordered or filtered.

### Avoid

- `React.FC` — use plain function declarations.
- Default exports from `lib/` utilities — use named exports.
- Inline styles — use Tailwind classes.
- Direct DOM manipulation — use React state and refs.
- `console.log` in committed code — use `console.error` for server-side errors, and structured logging in production.
- Barrel files (`index.ts` that re-export) — they create circular dependency risks and hurt tree-shaking. Import directly from the source file.

---

## API Routes

Structure every API Route handler consistently:

```ts
// app/api/study-plans/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const plans = await prisma.studyPlan.findMany({
      where: { userId: session.user.id },
      select: { id: true, createdAt: true, sessions: { select: { id: true, scheduledDate: true, status: true } } },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ data: plans });
  } catch (error) {
    console.error("[study-plans GET]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
```

Rules:
- Always check authentication first.
- Always wrap database/AI calls in try/catch.
- Return consistent shapes: `{ data: ... }` on success, `{ error: "..." }` on failure.
- Never expose stack traces or raw Prisma errors to the client.
- Use HTTP status codes correctly: 200, 201, 400, 401, 403, 404, 500.

---

## Server Actions

```ts
// actions/quiz.ts
"use server";

import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { generateQuizFromAI } from "@/lib/ai/quiz";

const GenerateQuizSchema = z.object({
  topicId: z.string().uuid(),
  numQuestions: z.number().min(3).max(20),
});

export async function generateQuiz(input: unknown) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return { success: false as const, error: "Unauthorized" };
  }

  const parsed = GenerateQuizSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false as const, error: "Invalid input" };
  }

  try {
    const result = await generateQuizFromAI(parsed.data);
    return { success: true as const, data: result };
  } catch (err) {
    console.error("[generateQuiz]", err);
    return { success: false as const, error: "Failed to generate quiz" };
  }
}
```

Rules:
- Always validate input with **Zod** before processing.
- Always check session/authentication.
- Return plain serialisable values (no class instances, no Prisma model objects with circular refs).
- Never throw `Error` objects from Server Actions — return `{ success, data }` or `{ success, error }` tuples instead. The calling Client Component handles both branches explicitly.

---

## Error Handling

### Server-Side

- Log all errors with context: `console.error("[module name]", error)`.
- Never surface raw errors to the client.
- Use early returns to keep the happy path unindented.

### Client-Side

- Display user-friendly error messages from the API response `error` field.
- Use loading, error, and empty states for all async UI.

```tsx
if (isLoading) return <LoadingSpinner />;
if (error) return <ErrorMessage message={error} />;
if (!sessions.length) return <EmptyState message="No sessions scheduled yet." />;
```

---

## Database (Prisma)

- Never use `prisma.$queryRaw` unless there is no Prisma alternative and it is reviewed by a senior engineer.
- Always select only the fields needed — avoid `findMany` without `select` on large tables.
- Use transactions for multi-step writes:

```ts
await prisma.$transaction([
  prisma.studySession.update({ where: { id }, data: { status: "missed" } }),
  prisma.studyPlan.update({ where: { id: planId }, data: { updatedAt: new Date() } }),
]);
```

---

## Comments & Documentation

- Write comments to explain **why**, not **what**. The code explains what.
- Use JSDoc for exported functions and complex utilities:

```ts
/**
 * Generates a study plan for the given user based on their courses,
 * topic priorities, and available study hours before each exam date.
 */
export async function generateStudyPlan(input: StudyPlanInput): Promise<StudyPlanOutput> { ... }
```

- Avoid commented-out code. Delete it; Git preserves history.

---

## Imports

Use absolute imports via the `@/` alias configured in `tsconfig.json`:

```ts
// ✅ Correct
import { prisma } from "@/lib/db";
import { StudyPlanCard } from "@/components/study-plan/StudyPlanCard";

// ❌ Wrong
import { prisma } from "../../lib/db";
```

Group imports in this order, separated by a blank line:
1. Node built-ins
2. External packages
3. Internal (`@/`)

---

## Environment Variables

- Access environment variables only in server-side code (API Routes, Server Actions, `lib/`).
- Never import `process.env` in Client Components.
- All required variables must be listed in `.env.example` with placeholder values and comments.

```bash
# .env.example
DATABASE_URL=postgresql://user:password@localhost:5432/prepmate
DEEPSEEK_API_KEY=your_deepseek_api_key
NEXTAUTH_SECRET=your_nextauth_secret
NEXTAUTH_URL=http://localhost:3000
```
