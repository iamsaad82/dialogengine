/*
  Warnings:

  - You are about to alter the column `url` on the `flowise_configs` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(255)`.
  - You are about to alter the column `apiKey` on the `flowise_configs` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(255)`.
  - You are about to alter the column `name` on the `templates` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(255)`.
  - You are about to alter the column `subdomain` on the `templates` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(255)`.
  - Changed the type of `type` on the `templates` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'USER');

-- CreateEnum
CREATE TYPE "TemplateType" AS ENUM ('NEUTRAL', 'INDUSTRY', 'CUSTOM');

-- AlterTable
ALTER TABLE "flowise_configs" ALTER COLUMN "url" SET DATA TYPE VARCHAR(255),
ALTER COLUMN "apiKey" SET DATA TYPE VARCHAR(255);

-- Migrate existing template types
ALTER TABLE "templates" ALTER COLUMN "name" SET DATA TYPE VARCHAR(255),
ALTER COLUMN "subdomain" SET DATA TYPE VARCHAR(255);

-- Create temporary column for new type
ALTER TABLE "templates" ADD COLUMN "new_type" "TemplateType";

-- Update temporary column based on existing type
UPDATE "templates" 
SET "new_type" = CASE 
    WHEN "type" = 'neutral' THEN 'NEUTRAL'::"TemplateType"
    WHEN "type" = 'industry' THEN 'INDUSTRY'::"TemplateType"
    ELSE 'CUSTOM'::"TemplateType"
END;

-- Drop old column and rename new column
ALTER TABLE "templates" DROP COLUMN "type";
ALTER TABLE "templates" RENAME COLUMN "new_type" TO "type";
ALTER TABLE "templates" ALTER COLUMN "type" SET NOT NULL;

-- Add flowiseConfigId
ALTER TABLE "templates" ADD COLUMN "flowiseConfigId" TEXT;

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT NOT NULL,
    "hashedPassword" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'USER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "response_types" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "schema" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "response_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assets" (
    "id" TEXT NOT NULL,
    "type" VARCHAR(50) NOT NULL,
    "url" VARCHAR(255) NOT NULL,
    "key" VARCHAR(255) NOT NULL,
    "size" INTEGER NOT NULL,
    "mimeType" VARCHAR(100) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "assets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "response_types_name_key" ON "response_types"("name");

-- CreateIndex
CREATE INDEX "assets_type_idx" ON "assets"("type");

-- CreateIndex
CREATE INDEX "templates_type_idx" ON "templates"("type");

-- CreateIndex
CREATE INDEX "templates_active_idx" ON "templates"("active");

-- AddForeignKey
ALTER TABLE "templates" ADD CONSTRAINT "templates_flowiseConfigId_fkey" FOREIGN KEY ("flowiseConfigId") REFERENCES "flowise_configs"("id") ON DELETE SET NULL ON UPDATE CASCADE;
