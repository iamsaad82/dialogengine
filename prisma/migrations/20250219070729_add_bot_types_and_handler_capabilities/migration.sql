-- AlterTable
ALTER TABLE "template_handlers" ADD COLUMN     "capabilities" JSONB NOT NULL DEFAULT '[]',
ALTER COLUMN "metadata" SET DEFAULT '{}',
ALTER COLUMN "config" SET DEFAULT '{}';

-- AlterTable
ALTER TABLE "templates" ADD COLUMN     "bot_config" JSONB DEFAULT '{}',
ADD COLUMN     "bot_type" VARCHAR(50);

-- CreateIndex
CREATE INDEX "template_handlers_type_idx" ON "template_handlers"("type");

-- CreateIndex
CREATE INDEX "template_handlers_templateId_idx" ON "template_handlers"("templateId");

-- CreateIndex
CREATE INDEX "templates_bot_type_idx" ON "templates"("bot_type");
