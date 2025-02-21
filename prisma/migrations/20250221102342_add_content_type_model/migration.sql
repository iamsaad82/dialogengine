-- AlterTable
ALTER TABLE "ContentType" ALTER COLUMN "name" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "ContentType" ADD CONSTRAINT "ContentType_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
