---
trigger: always_on
---

# architecture.md — PrepMate AI

## System Overview

PrepMate AI is a full-stack web application built on the Next.js App Router. The system is composed of four primary layers: the frontend (React/Next.js), the backend (Next.js API Routes and Server Actions), the database (PostgreSQL via Prisma ORM), and the AI integration layer (DeepSeek API).

```
┌─────────────────────────────────────────────┐
│               Browser (Client)              │
│         React + Tailwind + shadcn/ui        │
└────────────────────┬────────────────────────┘
                     │ HTTPS
┌────────────────────▼────────────────────────┐
│           Next.js Application               │
│                                             │
│  ┌──────────────┐    ┌─────────────────┐    │
│  │  App Router  │    │  Server Actions │    │
│  │  (Pages/UI)  │    │  (Mutations)    │    │
│  └──────┬───────┘    └────────┬────────┘    │
│         │                     │             │
│  ┌──────▼─────────────────────▼────────┐    │
│  │         API Routes (app/api/)        │    │
│  └──────────────────┬──────────────────┘    │
│                     │                       │
│  ┌──────────────────▼──────────────────┐    │
│  │        AI Integration Layer         │    │
│  │           (lib/ai/)                 │    │
│  └──────────────────┬──────────────────┘    │
└─────────────────────┼───────────────────────┘
                      │
          ┌───────────┴──────────┐
          │                      │
┌─────────▼────────┐   ┌─────────▼────────┐
│   PostgreSQL DB  │   │  DeepSeek API    │
│  (via Prisma)    │   │  (External AI)   │
└──────────────────┘   └──────────────────┘
```

---

## Frontend Architecture

### Framework
- **Next.js 14+** with the App Router
- **React 18** with Server and Client Components
- **TypeScript** throughout

### Rendering Strategy

| Route Type | Strategy | Reason |
|---|---|---|
| Auth pages | Client Component | Form interactivity |
| Dashboard | Server Component + Client islands | Fast initial load |
| Study plan view | Server Component | Data-heavy, SEO not required |
| Quiz | Client Component | Interactive, stateful |
| Progress charts | Client Component | Real-time updates |

### Component Architecture

```
components/
├── ui/              # Base design system components (shadcn/ui, customized)
├── auth/            # RegisterForm, LoginForm, PasswordResetForm
├── dashboard/       # DashboardShell, TaskCard, UpcomingSession, ProgressSummary
├── study-plan/      # StudyPlanCalendar, SessionCard, RescheduleButton
├── quiz/            # QuizCard, QuestionBlock, ScoreDisplay
├── summarizer/      # SummarizerForm, SummaryOutput, KeyConceptList
└── progress/        # ProgressBar, CompletionChart, StreakCounter
```

### State Management

- **Server state**: Managed via Server Components and Server Actions (no external library needed for MVP).
- **Client state**: React `useState` and `useReducer` for local UI state (quiz answers, form state).
- **No global state library** (Redux, Zustand) in MVP scope. Introduce only if complexity demands it.

---

## Backend Architecture

### API Routes

All API routes live in `app/api/` and follow REST conventions.

| Endpoint | Method | Description |
|---|---|---|
| `/api/auth/[...nextauth]` | GET/POST | Authentication (NextAuth.js) |
| `/api/courses` | GET/POST | List and create courses |
| `/api/courses/[id]` | GET/PATCH/DELETE | Single course CRUD |
| `/api/courses/[id]/topics` | GET/POST | Manage topics per course |
| `/api/topics/[id]` | PATCH/DELETE | Update or remove a topic |
| `/api/study-plans` | GET/POST | Fetch and generate study plans |
| `/api/study-plans/[id]` | GET/DELETE | Single study plan |
| `/api/study-plans/[id]/reschedule` | POST | Trigger AI rescheduling |
| `/api/sessions/[id]/complete` | PATCH | Mark session as complete/missed |
| `/api/summarizer` | POST | Generate topic summary |
| `/api/quiz` | POST | Generate quiz for a topic |
| `/api/quiz/[id]/attempt` | POST | Submit quiz attempt and get score |
| `/api/progress` | GET | Fetch user progress records |

### Server Actions

Server Actions handle mutations invoked directly from Client Components. They live in `actions/` and are used via `useFormState` or direct async calls.

**Decision rule:** Use a Server Action when the mutation is a form submission on the same page (e.g., creating a course, updating settings). Use an API Route when the endpoint is called by multiple clients, triggers an AI generation, or needs to be independently testable without a UI.

```ts
// actions/study-plan.ts
"use server";

export async function generateStudyPlan(data: StudyPlanInput) {
  // 1. Validate input
  // 2. Call lib/ai/study-plan.ts
  // 3. Persist to database via Prisma
  // 4. Return result
}
```

### Middleware

`middleware.ts` at the root level protects all dashboard routes. Unauthenticated requests are redirected to `/login`.

```ts
// middleware.ts
export { default } from "next-auth/middleware";

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/courses/:path*",
    "/study-plan/:path*",
    "/summarizer/:path*",
    "/quiz/:path*",
    "/progress/:path*",
    "/api/courses/:path*",
    "/api/study-plans/:path*",
    "/api/summarizer/:path*",
    "/api/quiz/:path*",
    "/api/progress/:path*",
    "/api/sessions/:path*",
  ],
};
```

---

## Database Architecture

### ORM: Prisma

All database access goes through the Prisma Client. Raw SQL queries are not permitted in application code.

### Core Entities

```
Users
  └── Courses
        └── Topics
              └── Study Plans
                    └── Study Sessions
                          └── Tasks
Users
  └── Quiz Attempts
        └── Quizzes (linked to Topics)
Users
  └── Progress Records
```

### Schema Conventions

- All primary keys: `String @id @default(uuid())`
- All tables include: `createdAt DateTime @default(now())` and `updatedAt DateTime @updatedAt`
- Foreign keys are indexed
- Soft-delete not used in MVP; records are hard-deleted

### Database Schema (Abbreviated)

```prisma
model User {
  id            String         @id @default(uuid())
  email         String         @unique
  name          String
  passwordHash  String
  courses       Course[]
  studyPlans    StudyPlan[]
  quizAttempts  QuizAttempt[]
  progressRecords ProgressRecord[]
  createdAt     DateTime       @default(now())
  updatedAt     DateTime       @updatedAt
}

model Course {
  id        String   @id @default(uuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  name      String
  examDate  DateTime
  topics    Topic[]
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([userId])
}

model Topic {
  id        String         @id @default(uuid())
  courseId  String
  course    Course         @relation(fields: [courseId], references: [id], onDelete: Cascade)
  name      String
  priority  String         @default("medium")
  sessions  StudySession[]
  quizzes   Quiz[]
  createdAt DateTime       @default(now())
  updatedAt DateTime       @updatedAt

  @@index([courseId])
}

model StudyPlan {
  id        String         @id @default(uuid())
  userId    String
  user      User           @relation(fields: [userId], references: [id], onDelete: Cascade)
  sessions  StudySession[]
  createdAt DateTime       @default(now())
  updatedAt DateTime       @updatedAt

  @@index([userId])
}

model StudySession {
  id              String    @id @default(uuid())
  studyPlanId     String
  studyPlan       StudyPlan @relation(fields: [studyPlanId], references: [id], onDelete: Cascade)
  topicId         String
  topic           Topic     @relation(fields: [topicId], references: [id])
  scheduledDate   DateTime
  durationMinutes Int
  status          String    @default("pending") // pending | complete | missed
  tasks           Task[]
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  @@index([studyPlanId])
  @@index([topicId])
  @@index([scheduledDate])
  @@index([status])
}

model Task {
  id          String       @id @default(uuid())
  sessionId   String
  session     StudySession @relation(fields: [sessionId], references: [id], onDelete: Cascade)
  description String
  isComplete  Boolean      @default(false)
  createdAt   DateTime     @default(now())
  updatedAt   DateTime     @updatedAt

  @@index([sessionId])
}

model Quiz {
  id        String        @id @default(uuid())
  topicId   String
  topic     Topic         @relation(fields: [topicId], references: [id], onDelete: Cascade)
  questions Json          // Stored as JSON array
  attempts  QuizAttempt[]
  createdAt DateTime      @default(now())
  updatedAt DateTime      @updatedAt

  @@index([topicId])
}

model QuizAttempt {
  id        String   @id @default(uuid())
  quizId    String
  quiz      Quiz     @relation(fields: [quizId], references: [id], onDelete: Cascade)
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  score     Int
  answers   Json
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([quizId])
  @@index([userId])
}

model ProgressRecord {
  id                String   @id @default(uuid())
  userId            String
  user              User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  date              DateTime
  sessionsPlanned   Int
  sessionsCompleted Int
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  @@unique([userId, date])
  @@index([userId])
  @@index([date])
}
```

---

## AI Integration Architecture

All AI calls are isolated in `lib/ai/`. This layer is responsible for:

1. Constructing prompts with user data and system constraints
2. Calling the DeepSeek API
3. Parsing and validating the JSON response
4. Returning typed data to the API Route or Server Action

```
API Route / Server Action
        │
        ▼
  lib/ai/[feature].ts    ← prompt construction, API call, response parsing
        │
        ▼
  DeepSeek API           ← returns raw JSON string
        │
        ▼
  Validation + Typing    ← TypeScript interface check
        │
        ▼
  Prisma (persist)       ← structured data saved to DB
```

### Prompt Design Principles

- Always instruct the model to respond in JSON only.
- Include workload constraints (e.g., max hours per day, buffer before exam dates).
- Include user context (courses, topics, available hours, exam dates, weak subjects).
- Strip and re-validate all AI output before database writes.

---

## Error Handling Strategy

### AI Call Errors

All AI calls follow the retry + validate + wrap pattern:

1. **Retry**: Up to 2 retries with exponential backoff (1s, 2s) for transient failures.
2. **Validate**: Parse raw JSON with Zod. If parsing fails, log the raw response and throw.
3. **Wrap**: Catch all errors in the API Route / Server Action and return a generic user-facing message.

Never surface raw AI errors, stack traces, or Prisma errors to the client.

### Non-AI Errors

- API Routes return consistent error shapes: `{ error: "message" }` with appropriate HTTP status codes (400, 401, 404, 500).
- Server Actions throw plain `Error` objects caught by the Client Component's error boundary or form state.
- All errors are logged server-side with contextual prefix: `console.error("[module name]", error)`.

---

## Testing Strategy

| Layer | Framework | Location | Scope |
|-------|-----------|----------|-------|
| Unit (helpers, AI parsing) | Vitest | `lib/**/*.test.ts` | Pure logic, no DB |
| Integration (API Routes) | Vitest + Supertest | `app/api/**/*.test.ts` | Full request → response |
| Component | Vitest + Testing Library | `components/**/*.test.tsx` | Render, interact, a11y |
| E2E (optional for MVP) | Playwright | `e2e/` | Critical user flows |

- Co-locate test files with the source file (sibling `*.test.ts`).
- Run before committing: `npm run test`.
- Prioritise testing AI parsing/validation functions (most error-prone).
- Mock DeepSeek API in all non-E2E tests. Never hit the real API in CI.

---

## Authentication Architecture

Authentication uses **NextAuth.js** with the Credentials provider for MVP (email + password).

- Passwords are hashed with **bcrypt** before storage. Never store plain text.
- Sessions use **JWT strategy** stored in HTTP-only cookies.
- Protected routes are enforced by `middleware.ts`.
- Password recovery sends a time-limited reset token via email.

---

## Non-Functional Targets

| Concern | Target |
|---|---|
| Lighthouse Performance | 90+ |
| Lighthouse Accessibility | 90+ |
| Lighthouse Best Practices | 90+ |
| AI plan generation time | < 10 seconds |
| API response time (non-AI) | < 500ms |
| Uptime | 99%+ |
