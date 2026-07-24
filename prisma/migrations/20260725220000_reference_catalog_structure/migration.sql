-- Extend the administrator-managed reference catalog
ALTER TYPE "ReferenceEntityType" ADD VALUE IF NOT EXISTS 'WILAYA' BEFORE 'OTHER';
ALTER TYPE "ReferenceEntityType" ADD VALUE IF NOT EXISTS 'DOCUMENT_TYPE' BEFORE 'OTHER';
ALTER TABLE "reference_entities"
  ADD COLUMN "code" TEXT,
  ADD COLUMN "region" TEXT,
  ADD COLUMN "sortOrder" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "metadata" JSONB NOT NULL DEFAULT '{}';
CREATE UNIQUE INDEX "reference_entities_type_code_key" ON "reference_entities"("type","code");
DROP INDEX IF EXISTS "reference_entities_type_active_idx";
CREATE INDEX "reference_entities_type_active_sortOrder_idx" ON "reference_entities"("type","active","sortOrder");
