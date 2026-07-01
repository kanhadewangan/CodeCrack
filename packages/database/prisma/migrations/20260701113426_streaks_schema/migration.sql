-- CreateTable
CREATE TABLE "contribution" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "problemId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contribution_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "contribution_userId_createdAt_idx" ON "contribution"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "contribution" ADD CONSTRAINT "contribution_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contribution" ADD CONSTRAINT "contribution_problemId_fkey" FOREIGN KEY ("problemId") REFERENCES "problems"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
