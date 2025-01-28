-- CreateTable
CREATE TABLE "templates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "subdomain" TEXT,
    "jsonContent" JSONB NOT NULL,
    "jsonBranding" JSONB NOT NULL,
    "jsonBot" JSONB NOT NULL,
    "jsonMeta" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "flowise_configs" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "apiKey" TEXT,
    "responseRules" JSONB NOT NULL DEFAULT '[]',
    "defaultButtons" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "flowise_configs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "templates_subdomain_key" ON "templates"("subdomain");
