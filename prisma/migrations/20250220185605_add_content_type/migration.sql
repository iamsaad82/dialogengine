-- DropForeignKey
ALTER TABLE "UploadJob" DROP CONSTRAINT "UploadJob_templateId_fkey";

-- DropForeignKey
ALTER TABLE "template_handlers" DROP CONSTRAINT "template_handlers_templateId_fkey";

-- CreateTable
CREATE TABLE "ContentType" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "metadata" TEXT,
    "patterns" TEXT,
    "validators" TEXT,
    "templateId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContentType_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ContentType_templateId_idx" ON "ContentType"("templateId");

-- CreateIndex
CREATE INDEX "UploadJob_status_idx" ON "UploadJob"("status");

-- CreateIndex
CREATE INDEX "UploadJob_templateId_idx" ON "UploadJob"("templateId");

-- CreateIndex
CREATE INDEX "UploadJob_createdAt_idx" ON "UploadJob"("createdAt");

-- CreateIndex
CREATE INDEX "template_handlers_name_idx" ON "template_handlers"("name");

-- AddForeignKey
ALTER TABLE "template_handlers" ADD CONSTRAINT "template_handlers_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UploadJob" ADD CONSTRAINT "UploadJob_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;
