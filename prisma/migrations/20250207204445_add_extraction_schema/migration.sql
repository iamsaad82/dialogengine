/*
  Warnings:

  - You are about to drop the `Template` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Template" DROP CONSTRAINT "Template_flowiseConfigId_fkey";

-- DropForeignKey
ALTER TABLE "chat_logs" DROP CONSTRAINT "chat_logs_templateId_fkey";

-- DropTable
DROP TABLE "Template";

-- CreateTable
CREATE TABLE "templates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'NEUTRAL',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "subdomain" TEXT,
    "jsonContent" TEXT,
    "jsonBranding" TEXT,
    "jsonBot" TEXT,
    "jsonMeta" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "flowiseConfigId" TEXT,

    CONSTRAINT "templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExtractionSchema" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "fields" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExtractionSchema_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "templates_subdomain_key" ON "templates"("subdomain");

-- CreateIndex
CREATE UNIQUE INDEX "templates_flowiseConfigId_key" ON "templates"("flowiseConfigId");

-- CreateIndex
CREATE UNIQUE INDEX "ExtractionSchema_templateId_key" ON "ExtractionSchema"("templateId");

-- AddForeignKey
ALTER TABLE "templates" ADD CONSTRAINT "templates_flowiseConfigId_fkey" FOREIGN KEY ("flowiseConfigId") REFERENCES "flowise_configs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_logs" ADD CONSTRAINT "chat_logs_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExtractionSchema" ADD CONSTRAINT "ExtractionSchema_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;
