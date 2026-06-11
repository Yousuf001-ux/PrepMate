---
description: >
  Use this skill whenever you need to build, scaffold, or refactor a React component in PrepMate
  AI. Triggers include: "build a component for X", "create a card for Y", "add a form for Z",
  "scaffold the quiz UI", "build the dashboard widget", "create an empty state", "add a loading
  skeleton", or any task that produces a file in the components/ directory. Also use when
  deciding whether a component should be a Server Component or Client Component, when wiring a
  component to a Server Action or API Route, or when applying design system tokens to a UI
  element. Always read this skill before writing component files — it enforces correct
  Server/Client boundaries, design token usage, accessibility, and folder placement.
---

# Component Builder — PrepMate AI

This skill governs how React components are built in PrepMate AI. Every component must follow
the conventions here: correct Server/Client boundary, design system tokens, accessibility
requirements, and TypeScript props interface.

---

## Component Folder Map

Place components in the correct folder. Never put feature components in `components/ui/`.

```
components/
├── ui/              # shadcn/ui base components only (Button, Card, Input, etc.)
├── auth/            # RegisterForm, LoginForm, PasswordResetForm
├── dashboard/       # DashboardShell, TaskCard, UpcomingSession, ProgressSummary
├── study-plan/      # StudyPlanCalendar, SessionCard, RescheduleButton, PlanTimeline
├── quiz/            # QuizCard, QuestionBlock, OptionButton, ScoreDisplay, QuizForm
├── summarizer/      # SummarizerForm, SummaryOutput, KeyConceptList, RevisionNotes
├── progress/        # ProgressBar, CompletionChart, StreakCounter, CourseProgress
└── shared/          # EmptyState, LoadingSpinner, ErrorFallback
```

---

## Server vs Client: Decision Rule

**Default to Server Component.** Add `"use client"` only if the component needs:

| Needs | Use Client? |
|---|---|
| `useState`, `useReducer`, `useRef` | Yes |
| `useEffect`, `useCallback`, `useMemo` | Yes |
| Event handlers (`onClick`, `onChange`) | Yes |
| Browser APIs (`window`, `document`, `localStorage`) | Yes |
| Third-party client libs (charts, animations) | Yes |
| Only data display, no interactivity | **No — Server Component** |
| Async data fetching inside the component | **No — Server Component** |

When in doubt: start as Server Component. If the compiler complains, add `"use client"`.

---

## Component Templates

### Server Component (data display)

```tsx
// components/study-plan/SessionCard.tsx
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock } from "lucide-react";
import type { StudySession } from "@/types";

interface SessionCardProps {
  session: StudySession;
}

const statusStyles: Record<Session["status"], string> = {
  complete: "bg-success/10 text-success border-success/20",
  missed:   "bg-warning/10 text-warning border-warning/20",
  pending:  "bg-muted text-muted-foreground border-border",
};

export function SessionCard({ session }: SessionCardProps) {
  return (
    <Card className="bg-surface rounded-xl shadow-sm">
      <CardHeader className="flex flex-row items-start justify-between gap-4 p-6">
        <div className="flex flex-col gap-1">
          <CardTitle className="text-xl font-semibold text-foreground">
            {session.topic.name}
          </CardTitle>
          <p className="text-sm text-muted-foreground">{session.topic.course.name}</p>
        </div>
        <Badge
          variant="outline"
          className={statusStyles[session.status]}
        >
          {session.status.charAt(0).toUpperCase() + session.status.slice(1)}
        </Badge>
      </CardHeader>
      <CardContent className="px-6 pb-6">
        <span className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="h-4 w-4" aria-hidden="true" />
          {session.durationMinutes} minutes
        </span>
      </CardContent>
    </Card>
  );
}
```

---

### Suspense / Loading Boundary

Wrap async Server Components or data-fetching children in `<Suspense>` with a matching skeleton:

```tsx
// components/dashboard/DashboardPage.tsx (Server Component)
import { Suspense } from "react";
import { UpcomingSession } from "./UpcomingSession";
import { UpcomingSessionSkeleton } from "./UpcomingSessionSkeleton";

export function DashboardPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold text-foreground">Dashboard</h1>
      <Suspense fallback={<UpcomingSessionSkeleton />}>
        <UpcomingSession />
      </Suspense>
    </div>
  );
}
```

The child (`UpcomingSession`) is an async Server Component that fetches data directly:

```tsx
// components/dashboard/UpcomingSession.tsx
import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { SessionCard } from "@/components/study-plan/SessionCard";

export async function UpcomingSession() {
  const session = await getServerSession(authOptions);
  const nextSession = await prisma.studySession.findFirst({
    where: { userId: session!.user.id, status: "pending" },
    orderBy: { scheduledDate: "asc" },
    include: { topic: { include: { course: true } } },
  });

  if (!nextSession) return <p className="text-sm text-muted-foreground">No upcoming sessions</p>;

  return <SessionCard session={nextSession} />;
}
```

---

### Client Component (interactive)

```tsx
// components/quiz/QuizCard.tsx
"use client";  // needs useState for selected answer, onClick handlers

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { CheckCircle, XCircle } from "lucide-react";
import type { QuizQuestion } from "@/types";

interface QuizCardProps {
  question: QuizQuestion;
  questionNumber: number;
  totalQuestions: number;
  onAnswer: (selectedIndex: number) => void;
}

export function QuizCard({
  question,
  questionNumber,
  totalQuestions,
  onAnswer,
}: QuizCardProps) {
  const [selected, setSelected] = useState<number | null>(null);
  const hasAnswered = selected !== null;

  function handleSelect(index: number) {
    if (hasAnswered) return;
    setSelected(index);
    onAnswer(index);
  }

  return (
    <Card className="bg-surface rounded-xl shadow-sm">
      <CardHeader className="p-6">
        <p className="text-sm text-muted-foreground mb-2">
          Question {questionNumber} of {totalQuestions}
        </p>
        <CardTitle className="text-xl font-semibold text-foreground leading-snug">
          {question.question}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 px-6 pb-6">
        {question.options.map((option, index) => {
          const isCorrect = index === question.correctIndex;
          const isSelected = index === selected;
          const optionStyle = cn(
            "w-full justify-start text-left border rounded-lg px-4 py-3 text-sm font-normal transition-colors",
            hasAnswered
              ? isCorrect
                ? "border-success bg-success/10 text-success"
                : isSelected
                  ? "border-destructive bg-destructive/10 text-destructive"
                  : "border-border text-muted-foreground opacity-60"
              : "border-border hover:border-primary hover:bg-primary/5 text-foreground",
          );

          return (
            <button
              key={index}
              className={optionStyle}
              onClick={() => handleSelect(index)}
              disabled={hasAnswered}
              aria-pressed={isSelected}
            >
              <span className="flex items-center gap-3">
                {hasAnswered && isCorrect && (
                  <CheckCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
                )}
                {hasAnswered && isSelected && !isCorrect && (
                  <XCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
                )}
                {option}
              </span>
            </button>
          );
        })}

        {hasAnswered && (
          <p className="mt-2 rounded-lg bg-muted p-4 text-sm text-foreground">
            <span className="font-semibold">Explanation: </span>
            {question.explanation}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
```

---

### Form Component (with Server Action)

```tsx
// components/auth/RegisterForm.tsx
"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { register } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface FormState {
  error?: string;
  fieldErrors?: Record<string, string[]>;
  success?: boolean;
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="default" className="w-full" disabled={pending}>
      {pending ? "Creating account…" : "Create account"}
    </Button>
  );
}

function FieldError({ field, state }: { field: string; state: FormState }) {
  const error = state.fieldErrors?.[field]?.[0];
  if (!error) return null;
  return <p className="text-xs text-destructive">{error}</p>;
}

export function RegisterForm() {
  const [state, formAction] = useActionState<FormState>(register, { error: null });

  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="name">Full name *</Label>
        <Input
          id="name"
          name="name"
          type="text"
          placeholder="Ada Lovelace"
          required
          className={cn(state.fieldErrors?.name && "border-destructive")}
        />
        <FieldError field="name" state={state} />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="email">Email address *</Label>
        <Input
          id="email"
          name="email"
          type="email"
          placeholder="ada@example.com"
          required
          className={cn(state.fieldErrors?.email && "border-destructive")}
        />
        <FieldError field="email" state={state} />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="password">Password *</Label>
        <Input
          id="password"
          name="password"
          type="password"
          required
          className={cn(state.fieldErrors?.password && "border-destructive")}
        />
        <FieldError field="password" state={state} />
      </div>

      {state.error && (
        <p className="text-sm text-destructive" role="alert">
          {state.error}
        </p>
      )}

      <SubmitButton />
    </form>
  );
}
```

---

## Standard UI Patterns

### Empty State

Every list view needs one. Always include an action:

```tsx
// components/shared/EmptyState.tsx
import { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
      <Icon className="h-10 w-10 text-muted-foreground" aria-hidden="true" />
      <p className="text-xl font-semibold text-foreground">{title}</p>
      <p className="max-w-sm text-sm text-muted-foreground">{description}</p>
      {actionLabel && onAction && (
        <Button variant="default" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
```

### Loading Skeleton

Match the skeleton shape to the real content layout:

```tsx
// components/study-plan/SessionCardSkeleton.tsx
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export function SessionCardSkeleton() {
  return (
    <Card className="bg-surface rounded-xl shadow-sm">
      <CardHeader className="flex flex-row items-start justify-between p-6">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-28" />
        </div>
        <Skeleton className="h-6 w-20 rounded-full" />
      </CardHeader>
      <CardContent className="px-6 pb-6">
        <Skeleton className="h-4 w-24" />
      </CardContent>
    </Card>
  );
}
```

### Progress Bar

```tsx
import { Progress } from "@/components/ui/progress";

interface CourseProgressProps {
  completed: number;
  total: number;
  label: string;
}

export function CourseProgress({ completed, total, label }: CourseProgressProps) {
  const percentage = total === 0 ? 0 : Math.round((completed / total) * 100);
  const isOnTrack = percentage >= 50;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-foreground">{label}</span>
        <span className="text-sm text-muted-foreground">{percentage}%</span>
      </div>
      <Progress
        value={percentage}
        className={isOnTrack ? "text-success" : "text-warning"}
        aria-label={`${label}: ${percentage}% complete`}
      />
      <p className="text-xs text-muted-foreground">
        {completed} of {total} sessions complete
      </p>
    </div>
  );
}
```

---

## Design Token Rules

Use only these Tailwind classes for colours. Never use raw colour values like `text-blue-600`:

| Intent | Class |
|---|---|
| Page/app background | `bg-background` |
| Card / panel | `bg-surface` |
| Primary action | `bg-primary text-primary-foreground` |
| Body text | `text-foreground` |
| Secondary text | `text-muted-foreground` |
| Success state | `text-success bg-success/10` |
| Warning state | `text-warning bg-warning/10` |
| Error / destructive | `text-destructive bg-destructive/10` |
| Borders | `border-border` |

---

## Accessibility Rules

Every component must satisfy:

- Interactive elements are keyboard-focusable: `focus-visible:ring-2 focus-visible:ring-primary`
- Decorative icons have `aria-hidden="true"`
- Meaningful icons have an `aria-label` or accompanying visible text
- Error messages use `role="alert"` so screen readers announce them
- Form fields linked to labels via `htmlFor` / `id`
- Disabled states use the `disabled` attribute, not just visual opacity
- Colour is never the **only** indicator of meaning (pair with text or icon)

---

## Component Checklist

Before marking a component done:

- [ ] Correct folder (`components/[feature]/ComponentName.tsx`)
- [ ] Server or Client Component decision is deliberate and documented with a comment if non-obvious
- [ ] Props interface defined with explicit TypeScript types
- [ ] Only design token Tailwind classes used — no raw colour values
- [ ] Conditional classes use `cn()` utility, never string concatenation
- [ ] Loading state handled via Suspense for Server Components, skeleton for Client Components
- [ ] Error state handled (error message with `role="alert"`)
- [ ] Empty state handled (not a blank area)
- [ ] Form fields show per-field validation errors with `border-destructive` styling
- [ ] Decorative icons have `aria-hidden="true"`
- [ ] Interactive elements are keyboard-accessible
- [ ] Component exports a named export (not default export, for tree-shaking clarity)
- [ ] No inline styles
- [ ] No direct `new Date()` formatting — use `date-fns` or `Intl.DateTimeFormat`
