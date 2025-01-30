/*
  Warnings:

  - You are about to drop the `ChatLog` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "ChatLog" DROP CONSTRAINT "ChatLog_templateId_fkey";

-- DropTable
DROP TABLE "ChatLog";

-- CreateTable
CREATE TABLE "chat_logs" (
    "id" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "question" TEXT NOT NULL,
    "answer" TEXT,
    "wasAnswered" BOOLEAN NOT NULL,
    "matchedExampleId" TEXT,
    "templateId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,

    CONSTRAINT "chat_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "chat_logs_templateId_idx" ON "chat_logs"("templateId");

-- CreateIndex
CREATE INDEX "chat_logs_timestamp_idx" ON "chat_logs"("timestamp");

-- AddForeignKey
ALTER TABLE "chat_logs" ADD CONSTRAINT "chat_logs_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "Template"("id") ON DELETE CASCADE ON UPDATE CASCADE;
