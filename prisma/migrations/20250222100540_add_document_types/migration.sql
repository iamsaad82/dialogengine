/*
  Warnings:

  - You are about to drop the `content_types` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "content_types" DROP CONSTRAINT "content_types_templateId_fkey";

-- DropTable
DROP TABLE "content_types";

-- CreateTable
CREATE TABLE "document_types" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL,
    "patterns" JSONB NOT NULL DEFAULT '[]',
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "validation" JSONB NOT NULL DEFAULT '{}',
    "responseConfig" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "document_types_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "document_types_templateId_idx" ON "document_types"("templateId");

-- CreateIndex
CREATE INDEX "document_types_type_idx" ON "document_types"("type");

-- AddForeignKey
ALTER TABLE "document_types" ADD CONSTRAINT "document_types_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;
