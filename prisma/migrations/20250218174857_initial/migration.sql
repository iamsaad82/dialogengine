-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'USER');

-- CreateEnum
CREATE TYPE "TemplateType" AS ENUM ('NEUTRAL', 'INDUSTRY', 'CUSTOM');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT NOT NULL,
    "hashedPassword" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'USER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "templates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'NEUTRAL',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "subdomain" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "flowiseConfigId" TEXT,
    "branding" JSONB NOT NULL DEFAULT '{}',
    "config" JSONB NOT NULL DEFAULT '{}',
    "content" JSONB NOT NULL DEFAULT '{"metadata": {}, "sections": []}',
    "description" TEXT,
    "handlers" JSONB NOT NULL DEFAULT '[]',
    "meta" JSONB NOT NULL DEFAULT '{}',
    "responses" JSONB NOT NULL DEFAULT '{"rules": [], "templates": []}',

    CONSTRAINT "templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "flowise_configs" (
    "id" TEXT NOT NULL,
    "url" VARCHAR(255) NOT NULL,
    "apiKey" VARCHAR(255),
    "responseRules" JSONB NOT NULL DEFAULT '[]',
    "defaultButtons" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "flowise_configs_pkey" PRIMARY KEY ("id")
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

-- CreateTable
CREATE TABLE "chat_logs" (
    "id" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "question" TEXT NOT NULL,
    "answer" TEXT,
    "wasAnswered" BOOLEAN NOT NULL,
    "matchedExampleId" TEXT,
    "templateId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,

    CONSTRAINT "chat_logs_pkey" PRIMARY KEY ("id")
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

-- CreateTable
CREATE TABLE "template_handlers" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "metadata" JSONB NOT NULL,
    "config" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "template_handlers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "templates_subdomain_key" ON "templates"("subdomain");

-- CreateIndex
CREATE UNIQUE INDEX "templates_flowiseConfigId_key" ON "templates"("flowiseConfigId");

-- CreateIndex
CREATE UNIQUE INDEX "response_types_name_key" ON "response_types"("name");

-- CreateIndex
CREATE INDEX "assets_type_idx" ON "assets"("type");

-- CreateIndex
CREATE INDEX "chat_logs_templateId_idx" ON "chat_logs"("templateId");

-- CreateIndex
CREATE INDEX "chat_logs_timestamp_idx" ON "chat_logs"("timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "ExtractionSchema_templateId_key" ON "ExtractionSchema"("templateId");

-- AddForeignKey
ALTER TABLE "templates" ADD CONSTRAINT "templates_flowiseConfigId_fkey" FOREIGN KEY ("flowiseConfigId") REFERENCES "flowise_configs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_logs" ADD CONSTRAINT "chat_logs_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExtractionSchema" ADD CONSTRAINT "ExtractionSchema_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "template_handlers" ADD CONSTRAINT "template_handlers_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
