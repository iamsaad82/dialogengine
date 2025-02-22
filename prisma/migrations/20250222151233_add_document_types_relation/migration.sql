-- AlterTable
ALTER TABLE "document_types" ALTER COLUMN "patterns" DROP DEFAULT,
ALTER COLUMN "metadata" DROP DEFAULT,
ALTER COLUMN "validation" DROP DEFAULT,
ALTER COLUMN "responseConfig" DROP DEFAULT;

-- CreateIndex
CREATE INDEX "templates_type_idx" ON "templates"("type");

-- CreateIndex
CREATE INDEX "templates_active_idx" ON "templates"("active");

-- CreateIndex
CREATE INDEX "templates_subdomain_idx" ON "templates"("subdomain");
