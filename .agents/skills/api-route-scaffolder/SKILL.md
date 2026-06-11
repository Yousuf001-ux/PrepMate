---
description: >
  Use this skill whenever you need to create a new Next.js API Route in PrepMate AI, add a new
  HTTP method to an existing route file, or ensure a route follows the project's security,
  validation, and error-handling conventions. Triggers include: "add an API endpoint", "create
  a route for X", "scaffold a POST/GET/PATCH/DELETE handler", "build the backend for X feature",
  or any time a new resource needs a server-side handler. Always use this skill before writing
  any file inside app/api/ to ensure auth, Zod validation, Prisma ownership checks, and response
  shapes are implemented correctly from the start.
---

# API Route Scaffolder — PrepMate AI

This skill generates correctly structured Next.js App Router API Route handlers for PrepMate AI.
Every route must follow the auth → validate → act → respond pattern without exception.

---

## Route File Location

```
app/api/
├── courses/
│   ├── route.ts               # GET (list), POST (create)
│   └── [id]/
│       ├── route.ts           # GET, PATCH, DELETE by ID
│       └── topics/
│           └── route.ts       # GET (list per course), POST (create)
├── topics/
│   └── [id]/
│       └── route.ts           # PATCH, DELETE (standalone topic)
├── study-plans/
│   ├── route.ts
│   └── [id]/
│       ├── route.ts
│       └── reschedule/
│           └── route.ts       # POST only
├── sessions/
│   └── [id]/
│       └── complete/
│           └── route.ts       # PATCH only
├── summarizer/
│   └── route.ts               # POST only
├── quiz/
│   ├── route.ts               # POST (generate)
│   └── [id]/
│       └── attempt/
│           └── route.ts       # POST (submit attempt)
└── progress/
    └── route.ts               # GET
```

---

## Core Route Template

Copy this template for every new route handler. Fill in the sections marked `// TODO`.

```ts
// app/api/[resource]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

// TODO: Define the Zod schema for request body validation (POST/PATCH only)
const CreateResourceSchema = z.object({
  name: z.string().min(1).max(100),
  // ... other fields
});

// ── GET ──────────────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  // 1. Auth check — always first
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // 2. Query — always scope to session.user.id
    const records = await prisma.resource.findMany({
      where: { userId: session.user.id },
      select: { id: true, name: true, createdAt: true },  // never over-fetch
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ data: records });
  } catch (err) {
    console.error("[resource GET]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ── POST ─────────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  // 1. Auth check
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. Parse and validate body
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = CreateResourceSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  try {
    // 3. Act — create record, scoped to user
    const record = await prisma.resource.create({
      data: {
        ...parsed.data,
        userId: session.user.id,
      },
    });

    return NextResponse.json({ data: record }, { status: 201 });
  } catch (err) {
    console.error("[resource POST]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
```

---

## Dynamic Route Template (with ownership check)

For routes with `[id]` params, always verify ownership — never fetch by ID alone.

```ts
// app/api/[resource]/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

// Next.js 15+ wraps params in Promise. Await before use.
type RouteContext = {
  params: Promise<{ id: string }>;
};

// ── GET by ID ─────────────────────────────────────────────────────────────────
export async function GET(req: NextRequest, context: RouteContext) {
  const params = await context.params;
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // CRITICAL: always include userId in the where clause
    const record = await prisma.resource.findFirst({
      where: { id: params.id, userId: session.user.id },
    });

    // Return 404 regardless of whether the record doesn't exist
    // or belongs to another user — don't leak ownership information
    if (!record) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ data: record });
  } catch (err) {
    console.error("[resource/:id GET]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ── PATCH by ID ───────────────────────────────────────────────────────────────
export async function PATCH(req: NextRequest, context: RouteContext) {
  const params = await context.params;
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const UpdateSchema = z.object({
    name: z.string().min(1).max(100).optional(),
    // TODO: add updatable fields
  }).strict(); // reject unexpected keys

  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = UpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
  }

  try {
    // Verify ownership before updating
    const existing = await prisma.resource.findFirst({
      where: { id: params.id, userId: session.user.id },
    });
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const updated = await prisma.resource.update({
      where: { id: params.id },
      data: parsed.data,
    });

    return NextResponse.json({ data: updated });
  } catch (err) {
    console.error("[resource/:id PATCH]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ── DELETE by ID ──────────────────────────────────────────────────────────────
export async function DELETE(req: NextRequest, context: RouteContext) {
  const params = await context.params;
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const existing = await prisma.resource.findFirst({
      where: { id: params.id, userId: session.user.id },
    });
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await prisma.resource.delete({ where: { id: params.id } });

    return new NextResponse(null, { status: 204 });
  } catch (err) {
    console.error("[resource/:id DELETE]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
```

---

## Response Shape Convention

Always use these shapes — never deviate:

| Scenario | Shape | Status |
|---|---|---|
| Success (read) | `{ data: ... }` | 200 |
| Success (created) | `{ data: ... }` | 201 |
| Success (deleted) | _(empty body)_ | 204 |
| Validation error | `{ error: "Invalid input", details: ... }` | 400 |
| Unauthenticated | `{ error: "Unauthorized" }` | 401 |
| Forbidden / Not found | `{ error: "Not found" }` | 404 |
| Server error | `{ error: "Internal server error" }` | 500 |

---

## AI-Powered Route Additions

When the route triggers an AI call (study plan generation, summarizer, quiz generator):

```ts
// After auth + validation:
import { generateStudyPlan } from "@/lib/ai/study-plan";

try {
  const aiOutput = await generateStudyPlan(parsed.data);  // lib/ai call only
  // persist aiOutput to DB, then return
} catch (err) {
  // AI failure: return 500 with generic message, never the raw AI error
  console.error("[resource AI call]", err);
  return NextResponse.json(
    { error: "Unable to generate content. Please try again." },
    { status: 500 }
  );
}
```

---

## Caching & Revalidation

AI-generated content (study plans, summaries, quizzes) is user-specific and dynamic — do not cache at the CDN level. Use `stale-while-revalidate` only if the same input produces the same output:

```ts
return NextResponse.json({ data: record }, {
  status: 200,
  headers: {
    "Cache-Control": "private, no-cache, no-store, must-revalidate",
  },
});
```

For read-only reference data (course list, topic list), a short `s-maxage` is acceptable:
```ts
"Cache-Control": "private, s-maxage=60, stale-while-revalidate=30",
```

---

## Rate Limiting

Apply rate limiting to auth and AI routes using a shared helper. See `.agents/rules/security.md` for limits.

```ts
// lib/rate-limiter.ts
const store = new Map<string, { count: number; resetAt: number }>();

export function checkRateLimit(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const entry = store.get(key);
  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (entry.count >= max) return false;
  entry.count++;
  return true;
}
```

Usage in a route:
```ts
const ip = req.headers.get("x-forwarded-for") ?? "unknown";
if (!checkRateLimit(`ai:${ip}`, 10, 60_000)) {
  return NextResponse.json({ error: "Too many requests" }, { status: 429 });
}
```

| Endpoint | Limit | Window |
|---|---|---|
| Auth routes | 5 requests | 60s |
| AI routes (summarizer, quiz, study-plan) | 10 requests | 60s |
| Reschedule | 3 requests | 3600s |

---

## Pagination

List endpoints (`GET /api/courses`, `GET /api/study-plans`, etc.) must support cursor-based pagination:

```ts
const { searchParams } = new URL(req.url);
const cursor = searchParams.get("cursor");  // last record ID from previous page
const limit = Math.min(Number(searchParams.get("limit")) || 20, 100);

const records = await prisma.resource.findMany({
  where: { userId: session.user.id },
  select: { id: true, name: true, createdAt: true },  // always select only needed fields
  orderBy: { createdAt: "desc" },
  take: limit + 1,  // fetch one extra to detect next page
  ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
});

const hasMore = records.length > limit;
const nextCursor = hasMore ? records[limit - 1]!.id : null;
if (hasMore) records.pop();

return NextResponse.json({ data: records, nextCursor });
```

---

## Quick Reference: PrepMate Route Inventory

| Route | Methods | Notes |
|---|---|---|
| `/api/courses` | GET, POST | List/create user's courses |
| `/api/courses/[id]` | GET, PATCH, DELETE | Single course |
| `/api/courses/[id]/topics` | GET, POST | Topics per course |
| `/api/topics/[id]` | PATCH, DELETE | Update/remove topic |
| `/api/study-plans` | GET, POST | List/generate study plans |
| `/api/study-plans/[id]` | GET, DELETE | Single plan |
| `/api/study-plans/[id]/reschedule` | POST | AI rescheduler trigger |
| `/api/sessions/[id]/complete` | PATCH | Mark session complete/missed |
| `/api/summarizer` | POST | AI topic summary |
| `/api/quiz` | POST | AI quiz generation |
| `/api/quiz/[id]/attempt` | POST | Submit attempt, get score |
| `/api/progress` | GET | User progress records |

---

## Scaffolding Checklist

Before marking a new route done:

- [ ] Auth check is the **first** thing in every handler
- [ ] Request body parsed with `req.json()` inside a try/catch
- [ ] Input validated with Zod `safeParse` (not `parse` — we handle errors manually)
- [ ] All DB queries include `userId: session.user.id` in the `where` clause
- [ ] ID-scoped routes use `await context.params` (Next.js 15) then `findFirst({ where: { id, userId } })`
- [ ] List queries use `select` to fetch only needed fields
- [ ] List endpoints support cursor-based pagination (`?cursor=&limit=`)
- [ ] Rate limiting applied to auth (5/min) and AI (10/min) routes
- [ ] Success responses use `{ data: ... }` shape
- [ ] Error responses use `{ error: "..." }` shape with correct status code
- [ ] All errors logged with `console.error("[route name]", err)`
- [ ] Raw errors never sent to the client
- [ ] AI routes use `lib/ai/` — no direct DeepSeek calls in route files
