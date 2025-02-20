-- AlterTable
ALTER TABLE "ExtractionSchema" ADD COLUMN     "metadata" JSONB DEFAULT '{}';

-- CreateIndex
CREATE INDEX "ExtractionSchema_templateId_idx" ON "ExtractionSchema"("templateId");
