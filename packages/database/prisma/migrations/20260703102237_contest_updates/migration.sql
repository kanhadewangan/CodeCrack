-- CreateTable
CREATE TABLE "contestRewards" (
    "id" TEXT NOT NULL,
    "contestId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "rewardType" "rewardType" NOT NULL,
    "rewardValue" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contestRewards_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "contestRewards_contestId_userId_idx" ON "contestRewards"("contestId", "userId");

-- AddForeignKey
ALTER TABLE "contestRewards" ADD CONSTRAINT "contestRewards_contestId_fkey" FOREIGN KEY ("contestId") REFERENCES "contest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contestRewards" ADD CONSTRAINT "contestRewards_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
