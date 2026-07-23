-- National cross-intelligence, geographic hierarchy, flexible validations and reference catalog
CREATE TYPE "ReferenceEntityType" AS ENUM ('WHOLESALER','LABORATORY','HEALTH_ESTABLISHMENT','PHARMACY','SUPPLIER','COMPETITOR','OTHER');
CREATE TYPE "SignalStatus" AS ENUM ('EMERGING','CONFIRMED','CONTRADICTORY','TREND');
ALTER TABLE "users" ADD COLUMN "region" TEXT, ADD COLUMN "wilaya" TEXT;
ALTER TABLE "documents" ADD COLUMN "entityType" "ReferenceEntityType" NOT NULL DEFAULT 'WHOLESALER', ADD COLUMN "entityName" TEXT, ADD COLUMN "wilaya" TEXT;
ALTER TABLE "intelligence_records" ADD COLUMN "signalId" TEXT;
CREATE INDEX "intelligence_records_signalId_idx" ON "intelligence_records"("signalId");

CREATE TABLE "reference_entities" ("id" TEXT NOT NULL,"type" "ReferenceEntityType" NOT NULL,"name" TEXT NOT NULL,"aliases" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],"active" BOOLEAN NOT NULL DEFAULT true,"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,"updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,CONSTRAINT "reference_entities_pkey" PRIMARY KEY ("id"));
CREATE UNIQUE INDEX "reference_entities_type_name_key" ON "reference_entities"("type","name");
CREATE INDEX "reference_entities_type_active_idx" ON "reference_entities"("type","active");

CREATE TABLE "document_validations" ("id" TEXT NOT NULL,"documentId" TEXT NOT NULL,"userId" TEXT NOT NULL,"comment" TEXT,"attachmentName" TEXT,"attachmentKey" TEXT,"attachmentMime" TEXT,"attachmentSize" INTEGER,"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,CONSTRAINT "document_validations_pkey" PRIMARY KEY ("id"));
CREATE INDEX "document_validations_documentId_createdAt_idx" ON "document_validations"("documentId","createdAt");

CREATE TABLE "information_signals" ("id" TEXT NOT NULL,"fingerprint" TEXT NOT NULL,"wholesaler" TEXT,"laboratory" TEXT,"product" TEXT NOT NULL,"offerType" "OfferType" NOT NULL,"status" "SignalStatus" NOT NULL DEFAULT 'EMERGING',"confirmationCount" INTEGER NOT NULL DEFAULT 1,"reliabilityScore" INTEGER NOT NULL DEFAULT 40,"firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,"lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,CONSTRAINT "information_signals_pkey" PRIMARY KEY ("id"));
CREATE UNIQUE INDEX "information_signals_fingerprint_key" ON "information_signals"("fingerprint");
CREATE INDEX "information_signals_status_reliabilityScore_idx" ON "information_signals"("status","reliabilityScore");
CREATE INDEX "information_signals_wholesaler_idx" ON "information_signals"("wholesaler");
CREATE INDEX "information_signals_laboratory_idx" ON "information_signals"("laboratory");
CREATE INDEX "information_signals_product_idx" ON "information_signals"("product");

CREATE TABLE "signal_confirmations" ("id" TEXT NOT NULL,"signalId" TEXT NOT NULL,"documentId" TEXT NOT NULL,"recordId" TEXT,"userId" TEXT NOT NULL,"region" TEXT,"wilaya" TEXT,"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,CONSTRAINT "signal_confirmations_pkey" PRIMARY KEY ("id"));
CREATE UNIQUE INDEX "signal_confirmations_signalId_documentId_userId_key" ON "signal_confirmations"("signalId","documentId","userId");
CREATE INDEX "signal_confirmations_signalId_createdAt_idx" ON "signal_confirmations"("signalId","createdAt");
CREATE INDEX "signal_confirmations_wilaya_idx" ON "signal_confirmations"("wilaya");

CREATE TABLE "document_confirmations" ("id" TEXT NOT NULL,"canonicalDocumentId" TEXT NOT NULL,"userId" TEXT NOT NULL,"region" TEXT,"wilaya" TEXT,"comment" TEXT,"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,CONSTRAINT "document_confirmations_pkey" PRIMARY KEY ("id"));
CREATE UNIQUE INDEX "document_confirmations_canonicalDocumentId_userId_key" ON "document_confirmations"("canonicalDocumentId","userId");
CREATE INDEX "document_confirmations_canonicalDocumentId_createdAt_idx" ON "document_confirmations"("canonicalDocumentId","createdAt");

ALTER TABLE "intelligence_records" ADD CONSTRAINT "intelligence_records_signalId_fkey" FOREIGN KEY ("signalId") REFERENCES "information_signals"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "document_validations" ADD CONSTRAINT "document_validations_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "document_validations" ADD CONSTRAINT "document_validations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "signal_confirmations" ADD CONSTRAINT "signal_confirmations_signalId_fkey" FOREIGN KEY ("signalId") REFERENCES "information_signals"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "signal_confirmations" ADD CONSTRAINT "signal_confirmations_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "signal_confirmations" ADD CONSTRAINT "signal_confirmations_recordId_fkey" FOREIGN KEY ("recordId") REFERENCES "intelligence_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "signal_confirmations" ADD CONSTRAINT "signal_confirmations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "document_confirmations" ADD CONSTRAINT "document_confirmations_canonicalDocumentId_fkey" FOREIGN KEY ("canonicalDocumentId") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "document_confirmations" ADD CONSTRAINT "document_confirmations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "reference_entities" ("id","type","name","aliases","updatedAt") VALUES
('wh-hydra-pharm','WHOLESALER','Hydra Pharm',ARRAY[]::TEXT[],CURRENT_TIMESTAMP),('wh-somepharm','WHOLESALER','Somepharm',ARRAY[]::TEXT[],CURRENT_TIMESTAMP),('wh-pharmainvest','WHOLESALER','Pharmainvest',ARRAY[]::TEXT[],CURRENT_TIMESTAMP),('wh-bigdis','WHOLESALER','Bigdis',ARRAY[]::TEXT[],CURRENT_TIMESTAMP),('wh-vecopharm','WHOLESALER','Vecopharm',ARRAY[]::TEXT[],CURRENT_TIMESTAMP),('wh-watson','WHOLESALER','Watson',ARRAY[]::TEXT[],CURRENT_TIMESTAMP),('wh-ldm','WHOLESALER','LDM',ARRAY[]::TEXT[],CURRENT_TIMESTAMP),('wh-biocare','WHOLESALER','Biocare',ARRAY[]::TEXT[],CURRENT_TIMESTAMP),('wh-milinum','WHOLESALER','Milinum',ARRAY['Millenium']::TEXT[],CURRENT_TIMESTAMP),('wh-bpo','WHOLESALER','BPO',ARRAY[]::TEXT[],CURRENT_TIMESTAMP),('wh-chark-pharm','WHOLESALER','Chark Pharm',ARRAY[]::TEXT[],CURRENT_TIMESTAMP)
ON CONFLICT ("type","name") DO NOTHING;
