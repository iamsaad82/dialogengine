-- DropIndex
DROP INDEX "ExtractionSchema_templateId_key";

-- AlterTable
ALTER TABLE "ExtractionSchema" ALTER COLUMN "metadata" DROP DEFAULT;
