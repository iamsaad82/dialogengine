/*
  Warnings:

  - You are about to drop the `ContentType` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "ContentType" DROP CONSTRAINT "ContentType_templateId_fkey";

-- DropTable
DROP TABLE "ContentType";

-- CreateTable
CREATE TABLE "content_types" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "name" TEXT,
    "description" TEXT,
    "metadata" JSONB DEFAULT '{}',
    "patterns" JSONB DEFAULT '[]',
    "validators" JSONB DEFAULT '[]',
    "templateId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "content_types_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "content_types_templateId_idx" ON "content_types"("templateId");

-- AddForeignKey
ALTER TABLE "content_types" ADD CONSTRAINT "content_types_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
