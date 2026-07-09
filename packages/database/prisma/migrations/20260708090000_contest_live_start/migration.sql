-- Contest lifecycle and live leaderboard support.
CREATE TYPE "contestStatus" AS ENUM ('DRAFT', 'SCHEDULED', 'RUNNING', 'ENDED', 'CANCELLED');

ALTER TABLE "contest"
ADD COLUMN "actualStartTime" TIMESTAMP(3),
ADD COLUMN "actualEndTime" TIMESTAMP(3),
ADD COLUMN "status" "contestStatus" NOT NULL DEFAULT 'DRAFT',
ADD COLUMN "creatorId" TEXT,
ADD COLUMN "minimumParticipants" INTEGER NOT NULL DEFAULT 1;

ALTER TABLE "submissions"
ADD COLUMN "contestId" TEXT;

ALTER TABLE "leaderboardContest"
ADD COLUMN "score" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "penalty" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "frozen" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

DROP INDEX IF EXISTS "contestParticipants_userId_key";

CREATE INDEX "contest_creatorId_idx" ON "contest"("creatorId");
CREATE INDEX "contest_status_idx" ON "contest"("status");
CREATE INDEX "submissions_contestId_idx" ON "submissions"("contestId");
CREATE UNIQUE INDEX "contestParticipants_contestId_userId_key" ON "contestParticipants"("contestId", "userId");
CREATE UNIQUE INDEX "leaderboardContest_contestId_userId_key" ON "leaderboardContest"("contestId", "userId");

ALTER TABLE "contest" ADD CONSTRAINT "contest_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_contestId_fkey" FOREIGN KEY ("contestId") REFERENCES "contest"("id") ON DELETE SET NULL ON UPDATE CASCADE;
