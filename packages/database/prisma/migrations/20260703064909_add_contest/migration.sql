-- CreateTable
CREATE TABLE "contestParticipants" (
    "id" TEXT NOT NULL,
    "contestId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contestParticipants_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "contestParticipants" ADD CONSTRAINT "contestParticipants_contestId_fkey" FOREIGN KEY ("contestId") REFERENCES "contest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contestParticipants" ADD CONSTRAINT "contestParticipants_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
