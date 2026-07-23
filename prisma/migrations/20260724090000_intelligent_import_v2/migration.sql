-- Intelligent import metadata and enriched pharmaceutical extraction
ALTER TYPE "DocumentStatus" ADD VALUE IF NOT EXISTS 'WAITING_AI' BEFORE 'PENDING';
ALTER TYPE "ProcessingJobStatus" ADD VALUE IF NOT EXISTS 'BLOCKED' BEFORE 'COMPLETED';

CREATE TYPE "DocumentType" AS ENUM ('FLASH_SALE','RESTOCK','COMMERCIAL_PROPOSAL','QUOTA','PROMOTION','CONVENTION','REBATE','EXCEPTIONAL_DISCOUNT','PRICING','CATALOG','STOCKOUT','PRODUCT_LAUNCH','COMMERCIAL_COMMUNICATION','LAB_INFORMATION','LETTER','EMAIL','OTHER');
CREATE TYPE "ConfidentialityLevel" AS ENUM ('INTERNAL','CONFIDENTIAL','HIGHLY_CONFIDENTIAL');
CREATE TYPE "PriorityLevel" AS ENUM ('LOW','NORMAL','HIGH','URGENT');
CREATE TYPE "ReviewStatus" AS ENUM ('PENDING_AI','NEEDS_REVIEW','VALIDATED');

ALTER TABLE "documents"
  ADD COLUMN "reviewStatus" "ReviewStatus" NOT NULL DEFAULT 'PENDING_AI',
  ADD COLUMN "wholesaler" TEXT,
  ADD COLUMN "customWholesaler" TEXT,
  ADD COLUMN "documentType" "DocumentType" NOT NULL DEFAULT 'OTHER',
  ADD COLUMN "customDocumentType" TEXT,
  ADD COLUMN "documentDate" TIMESTAMP(3),
  ADD COLUMN "receivedAt" TIMESTAMP(3),
  ADD COLUMN "region" TEXT,
  ADD COLUMN "laboratory" TEXT,
  ADD COLUMN "comments" TEXT,
  ADD COLUMN "confidentiality" "ConfidentialityLevel" NOT NULL DEFAULT 'INTERNAL',
  ADD COLUMN "priority" "PriorityLevel" NOT NULL DEFAULT 'NORMAL';

ALTER TABLE "intelligence_records"
  ADD COLUMN "productRange" TEXT,
  ADD COLUMN "molecule" TEXT,
  ADD COLUMN "therapeuticClass" TEXT,
  ADD COLUMN "productCode" TEXT,
  ADD COLUMN "cip" TEXT,
  ADD COLUMN "priceHt" DECIMAL(14,2),
  ADD COLUMN "priceTtc" DECIMAL(14,2),
  ADD COLUMN "promotionalPrice" DECIMAL(14,2),
  ADD COLUMN "freeUnits" INTEGER,
  ADD COLUMN "quota" TEXT,
  ADD COLUMN "commercialConditions" TEXT,
  ADD COLUMN "startsAt" TIMESTAMP(3),
  ADD COLUMN "endsAt" TIMESTAMP(3),
  ADD COLUMN "city" TEXT,
  ADD COLUMN "salesperson" TEXT,
  ADD COLUMN "distributionChannel" TEXT;

CREATE INDEX "intelligence_records_molecule_idx" ON "intelligence_records"("molecule");
CREATE INDEX "intelligence_records_therapeuticClass_idx" ON "intelligence_records"("therapeuticClass");
CREATE INDEX "documents_documentType_createdAt_idx" ON "documents"("documentType", "createdAt");
CREATE INDEX "documents_wholesaler_createdAt_idx" ON "documents"("wholesaler", "createdAt");
