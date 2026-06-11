# AGENTS.md — PrepMate AI

This file defines how AI agents and automated tools should interact with the PrepMate AI codebase. Read this before making any code changes, running scripts, or integrating AI capabilities.

---

## Project Overview

PrepMate AI is an AI-powered study planning and academic productivity platform built with Next.js, TypeScript, Prisma, PostgreSQL, and the DeepSeek API. The MVP targets university and medical students and covers study plan generation, topic summarization, quiz generation, progress tracking, and AI-driven rescheduling.

---

## Repository Structure

```
prepmate-ai/
├── .agents/                    # Agent configuration (rules, skills)
│   ├── rules/                  # Enforced conventions — read before coding
│   │   ├── architecture.md     # System architecture, layers, data flow
│   │   ├── code-style.md       # TypeScript, React, API, naming conventions
│   │   ├── design-system.md    # Colours, typography, components, a11y
│   │   └── security.md         # Auth, validation, prompt injection, CSP
│   └── skills/                 # Reusable workflows for common tasks
│       ├── ai-integration/
│       ├── api-route-scaffolder/
│       ├── component-builder/
│       └── db-migration-runner/
├── app/                        # Next.js App Router
│   ├── (auth)/                 # Auth group: login, register, password recovery
│   ├── (dashboard)/            # Protected dashboard routes
│   │   ├── dashboard/          # Main dashboard page
│   │   ├── courses/            # Course and topic management
│   │   ├── study-plan/         # Study plan view and controls
│   │   ├── summarizer/         # AI Topic Summarizer
│   │   ├── quiz/               # AI Quiz Generator
│   │   └── progress/           # Progress tracking
│   ├── api/                    # Next.js API Routes
│   │   ├── auth/               # Auth endpoints
│   │   ├── study-plans/        # Study plan CRUD + generation
│   │   ├── summarizer/         # AI summarization endpoint
│   │   ├── quiz/               # AI quiz generation endpoint
│   │   └── progress/           # Progress tracking endpoints
│   ├── layout.tsx
│   └── globals.css
├── components/
│   ├── ui/                     # shadcn/ui components (design-system-aligned)
│   ├── auth/                   # Auth forms and wrappers
│   ├── dashboard/              # Dashboard widgets
│   ├── study-plan/             # Study plan cards and timeline
│   ├── quiz/                   # Quiz UI components
│   ├── summarizer/             # Summarizer form and output
│   └── progress/               # Progress charts and indicators
├── lib/
│   ├── ai/                     # AI integration layer (DeepSeek API)
│   │   ├── study-plan.ts       # Study plan generation prompts + parsing
│   │   ├── summarizer.ts       # Summarization prompts + parsing
│   │   ├── quiz.ts             # Quiz generation prompts + parsing
│   │   └── reschedule.ts       # Rescheduling logic
│   ├── db/                     # Prisma client instance
│   ├── auth/                   # Auth helpers (session, JWT, middleware)
│   └── utils/                  # Shared utility functions
├── prisma/
│   ├── schema.prisma           # Database schema
│   └── migrations/             # Migration history
├── actions/                    # Next.js Server Actions
├── hooks/                      # Custom React hooks
├── types/                      # Global TypeScript types and interfaces
├── middleware.ts               # Route protection middleware
└── .env.local                  # Environment variables (never commit)
```

---

## AI Integration Layer

All AI functionality is powered by the **DeepSeek API**. The integration lives exclusively in `lib/ai/`. Do not call the DeepSeek API directly from components, pages, or Server Actions — always go through the abstraction in `lib/ai/`.

### DeepSeek API Usage

```ts
// lib/ai/client.ts
const response = await fetch("https://api.deepseek.com/chat/completions", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`,
  },
  body: JSON.stringify({
    model: "deepseek-chat",
    messages: [...],
    response_format: { type: "json_object" }, // Always request JSON
  }),
});
```

### AI Output Contract

All AI endpoints must return **structured JSON** suitable for database storage and UI rendering. Define and validate a TypeScript interface for every AI output before saving to the database.

Example study plan output shape:
```ts
interface StudyPlanOutput {
  sessions: {
    date: string;           // ISO 8601
    course: string;
    topic: string;
    durationMinutes: number;
    priority: "high" | "medium" | "low";
  }[];
}
```

### AI Feature Modules

| Module | File | Responsibility |
|---|---|---|
| Study Plan Generator | `lib/ai/study-plan.ts` | Generate realistic, balanced schedules |
| Topic Summarizer | `lib/ai/summarizer.ts` | Simplify concepts, extract key points |
| Quiz Generator | `lib/ai/quiz.ts` | Generate questions, answers, explanations |
| Rescheduler | `lib/ai/reschedule.ts` | Recalculate plan after missed sessions |

---

## Rule Files

Read the relevant rule file before starting work. Each file is in `.agents/rules/` and must be followed for all code in its domain.

| File | When to Read |
|------|-------------|
| `.agents/rules/architecture.md` | Before any architecture decision, new page/route, data model change, or AI feature |
| `.agents/rules/code-style.md` | Before writing any TypeScript, React, API Route, or Server Action |
| `.agents/rules/design-system.md` | Before writing any UI component — colours, typography, spacing, component patterns |
| `.agents/rules/security.md` | Before implementing auth, user input handling, AI prompts, or HTTP headers |

## Skills

Skills provide step-by-step workflows for recurring tasks. Load the relevant skill via the agent tool before starting the task.

| Skill | When to Use |
|-------|-------------|
| `ai-integration` | Adding/modifying any AI feature (study plan, quiz, summarizer, rescheduler) — prompt construction, DeepSeek calls, response parsing, type validation |
| `api-route-scaffolder` | Creating or modifying any file in `app/api/` — ensures auth, Zod validation, ownership checks, and response shapes are correct |
| `component-builder` | Building any component in `components/` — Server/Client boundary decisions, design tokens, accessibility, loading/error/empty states |
| `db-migration-runner` | Any change to `prisma/schema.prisma` — edit → migrate → generate → update code, with schema conventions and common operations |

## Agent Rules

### General Behaviour

- Always read `AGENTS.md` then the relevant rule files from `.agents/rules/` before making changes.
- Load the matching skill from `.agents/skills/` before starting a task — it contains the exact workflow to follow.
- Never modify the Prisma schema without creating a migration: `npx prisma migrate dev`.
- Never hard-code API keys, secrets, or environment-specific values. Use `.env.local`.
- Never call the DeepSeek API from the client (browser). All AI calls must originate from API Routes or Server Actions.
- Always validate and sanitize user input before passing it to any AI prompt.

### When Adding a New AI Feature

1. Load the `ai-integration` skill for the detailed workflow.
2. Define the prompt in the relevant `lib/ai/*.ts` file.
3. Define the expected JSON output interface in `types/`.
4. Parse and validate the AI response before using it.
5. Create or extend the API Route in `app/api/` (use `api-route-scaffolder` skill).
6. Add the corresponding Prisma model or field if persistence is needed (use `db-migration-runner` skill).
7. Write the UI component in `components/` (use `component-builder` skill).

### When Editing the Database Schema

1. Load the `db-migration-runner` skill for the exact workflow.
2. Edit `prisma/schema.prisma`.
3. Run `npx prisma migrate dev --name <migration-name>`.
4. Run `npx prisma generate` to update the Prisma Client.
5. Update affected Server Actions and API Routes.

### Error Handling for AI Calls

All AI calls must be wrapped in try/catch. On failure:
- Log the error server-side.
- Return a user-friendly error message to the client.
- Do not expose raw API errors or stack traces in API responses.
- Implement retry logic (max 2 retries with exponential backoff) for transient failures.

```ts
// Pattern for AI calls
try {
  const result = await callDeepSeek(prompt);
  const parsed = parseAndValidate(result);
  return { success: true, data: parsed };
} catch (error) {
  console.error("[AI Error]", error);
  return { success: false, error: "Unable to generate content. Please try again." };
}
```

---

## Environment Variables

| Variable | Description | Required |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string | Yes |
| `DEEPSEEK_API_KEY` | DeepSeek API key | Yes |
| `NEXTAUTH_SECRET` | Auth session secret | Yes |
| `NEXTAUTH_URL` | App base URL | Yes |

---

## Key Constraints

- **No mobile app** in MVP scope. Web only.
- **No real-time features** (no WebSockets, no polling for MVP).
- **No peer messaging or collaboration** features.
- All AI outputs must be validated against TypeScript interfaces before persistence.
- Prompt engineering must include workload constraints to prevent the AI from generating unrealistic schedules.
- Onboarding must guide users to provide sufficient data for accurate plan generation.

---

## Running the Project

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local

# Run database migrations
npx prisma migrate dev

# Generate Prisma Client
npx prisma generate

# Start development server
npm run dev

# Build for production
npm run build
```

---

## Launch Checklist

Before marking a feature complete, verify:

- [ ] User can complete the full action without critical errors
- [ ] AI output is validated and stored correctly
- [ ] Loading, error, and empty states are handled in the UI
- [ ] Route is protected by authentication middleware
- [ ] Input is validated both client-side and server-side
- [ ] Environment variables are documented in `.env.example`
