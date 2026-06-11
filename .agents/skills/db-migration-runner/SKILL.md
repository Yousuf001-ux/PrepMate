---
description: >
  Use this skill whenever you need to change the PrepMate AI database schema, add a new Prisma
  model, add or remove columns, create indexes, add relations, or run a migration. Triggers
  include: "add a field to the schema", "create a new model", "migrate the database", "update
  the Prisma schema", "add an index", "rename a column", "generate the Prisma client", or
  anything that touches prisma/schema.prisma or requires running prisma migrate. Always read
  this skill before editing schema.prisma — the order of operations matters and mistakes are
  hard to undo in production.
---

# DB Migration Runner — PrepMate AI

All database changes flow through Prisma Migrate. Never modify the database directly with SQL
in development — always edit `prisma/schema.prisma` and run the migration commands below.

---

## Stack

- **ORM**: Prisma
- **Database**: PostgreSQL
- **Schema file**: `prisma/schema.prisma`
- **Migrations directory**: `prisma/migrations/`

---

## Order of Operations

Every schema change follows this sequence — never skip steps:

```
1. Edit prisma/schema.prisma
2. Run: npx prisma migrate dev --name <migration-name>
3. Run: npx prisma generate
4. Update affected API Routes, Server Actions, and types
5. Test the change locally
```

---

## Schema Conventions

### Primary Keys
Always UUID, never auto-increment:
```prisma
id String @id @default(uuid())
```

### Timestamps
Every model includes both fields:
```prisma
createdAt DateTime @default(now())
updatedAt DateTime @updatedAt
```

### Foreign Keys + Indexes
Every foreign key column must have an `@@index`:
```prisma
model Topic {
  id       String @id @default(uuid())
  courseId String
  course   Course @relation(fields: [courseId], references: [id], onDelete: Cascade)

  @@index([courseId])
}
```

### Cascade Rules
Use `onDelete: Cascade` when child records should be deleted with the parent:
- Course deleted → Topics deleted
- StudyPlan deleted → StudySessions deleted
- StudySession deleted → Tasks deleted
- Quiz deleted → QuizAttempts deleted

Use `onDelete: Restrict` when deletion should be blocked if children exist:
- Topic deleted → blocked if StudySessions exist
- Course deleted → blocked if Topics with StudySessions exist

### JSON Fields
AI-generated data stored as JSON uses the `Json` type:
```prisma
questions Json   // Quiz questions array
answers   Json   // QuizAttempt submitted answers
```

### Enums
Use Prisma enums instead of `String` for fields with a fixed set of values:
```prisma
enum SessionStatus { pending complete missed }
enum TopicPriority  { high medium low }
```
This prevents typos at the database level and generates TypeScript union types.

### Sensitive Fields
`User.passwordHash` must never be selected in API responses. Always use an explicit `select` in queries — never `findMany` or `findFirst` without it:
```ts
// ✅ Correct — exclude passwordHash
const user = await prisma.user.findUnique({
  where: { id },
  select: { id: true, name: true, email: true },
});

// ❌ Wrong — leaks passwordHash
const user = await prisma.user.findUnique({ where: { id } });
```

---

## Troubleshooting

### Shadow Database
`prisma migrate dev` creates a shadow database (`prepmate-ai-shadow` by default) to detect schema drift. If you get a permission error:
1. Ensure your PostgreSQL user has `CREATE DATABASE` privileges.
2. Or set a custom shadow database URL in `schema.prisma`:
   ```prisma
   datasource db {
     provider = "postgresql"
     url      = env("DATABASE_URL")
     shadowDatabaseUrl = env("SHADOW_DATABASE_URL")
   }
   ```

---

## Full PrepMate Schema Reference

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum SessionStatus {
  pending
  complete
  missed
}

enum TopicPriority {
  high
  medium
  low
}

model User {
  id              String           @id @default(uuid())
  email           String           @unique
  name            String
  passwordHash    String
  courses         Course[]
  studyPlans      StudyPlan[]
  quizAttempts    QuizAttempt[]
  progressRecords ProgressRecord[]
  createdAt       DateTime         @default(now())
  updatedAt       DateTime         @updatedAt
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
  priority  TopicPriority  @default(medium)
  isWeak    Boolean        @default(false)
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
  id              String         @id @default(uuid())
  studyPlanId     String
  studyPlan       StudyPlan      @relation(fields: [studyPlanId], references: [id], onDelete: Cascade)
  topicId         String
  topic           Topic          @relation(fields: [topicId], references: [id], onDelete: Restrict)
  scheduledDate   DateTime
  durationMinutes Int
  status          SessionStatus  @default(pending)
  tasks           Task[]
  createdAt       DateTime       @default(now())
  updatedAt       DateTime       @updatedAt

  @@index([studyPlanId])
  @@index([topicId])
  @@index([status])
  @@index([scheduledDate])
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
  questions Json
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
  score     Int      @default(0)
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
  date              DateTime   // normalise to midnight in app code for daily aggregation
  sessionsPlanned   Int
  sessionsCompleted Int
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  @@index([userId, date])
  @@index([date])
}
```

---

## Migration Commands

### Development (standard workflow)
```bash
# Create and apply a new migration
npx prisma migrate dev --name <migration-name>

# Examples of good migration names:
npx prisma migrate dev --name add-topic-priority
npx prisma migrate dev --name add-progress-record-model
npx prisma migrate dev --name add-session-status-index
```

### After every schema change
```bash
# Regenerate the Prisma Client (TypeScript types + query builder)
npx prisma generate
```

### Inspect current state
```bash
# Open Prisma Studio (GUI for the database)
npx prisma studio

# Check migration status
npx prisma migrate status

# Validate schema without migrating
npx prisma validate
```

### Seeding (development data)
```bash
# Run the seed script (prisma/seed.ts)
npx prisma db seed
```

### Production deployments
```bash
# Apply pending migrations without prompting (CI/CD safe)
npx prisma migrate deploy
```

---

## Common Schema Operations

### Adding a field to an existing model

```prisma
model StudySession {
  // existing fields ...
  notes String? @default("")   // ← add here; use ? for nullable
}
```

Then:
```bash
npx prisma migrate dev --name add-notes-to-study-session
npx prisma generate
```

### Adding a new model

1. Write the full model block in `schema.prisma` following the conventions above.
2. Add the relation field to the parent model.
3. Run `migrate dev` with a descriptive name.
4. Run `generate`.

### Adding an index

```prisma
@@index([userId, createdAt])   // composite index
@@index([status])              // single field index
```

Indexes to consider adding when queries filter or sort by a field frequently.

### Renaming a field (safe approach)

Prisma does not auto-detect renames — it sees a delete + add.
To rename safely:

1. Add the new field (nullable).
2. Migrate and deploy.
3. Backfill data: `UPDATE table SET new_col = old_col WHERE new_col IS NULL`.
4. Make the new field non-nullable.
5. Remove the old field.
6. Migrate and deploy.

Never rename in a single migration in production — it will drop data.

---

## Prisma Client Usage Pattern

Always import from the singleton client, never instantiate directly in route files:

```ts
// lib/db.ts
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ?? new PrismaClient({ log: ["error"] });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
```

```ts
// In any server file
import { prisma } from "@/lib/db";
```

---

## Migration Checklist

Before running a migration:
- [ ] Schema change has been reviewed against `architecture.md` entity list
- [ ] New foreign keys have `@@index` on the FK column
- [ ] Nullable vs non-nullable is intentional (`?` suffix)
- [ ] Cascade behaviour (`onDelete`) is explicitly set for all relations
- [ ] Migration name is descriptive (verb + noun: `add-quiz-difficulty-field`)

After running a migration:
- [ ] `npx prisma generate` has been run
- [ ] Any affected Prisma queries in API Routes updated to use new fields
- [ ] Any new fields added to relevant TypeScript interfaces in `types/`
- [ ] `npx prisma validate` passes with no errors
- [ ] Prisma Studio spot-check confirms schema looks correct
