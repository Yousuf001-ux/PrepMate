-- AlterTable
ALTER TABLE "User" ADD COLUMN     "onboardingCompleted" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "Summary" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Summary_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Summary_userId_idx" ON "Summary"("userId");

-- AddForeignKey
ALTER TABLE "Summary" ADD CONSTRAINT "Summary_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
