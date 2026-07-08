/*
  Warnings:

  - A unique constraint covering the columns `[userId]` on the table `contestParticipants` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "contestParticipants_userId_key" ON "contestParticipants"("userId");

-- CreateIndex
CREATE INDEX "contestParticipants_contestId_userId_idx" ON "contestParticipants"("contestId", "userId");
