-- Manual field intelligence, validation workflow, comments, attachments and scoring
ALTER TYPE "ReviewStatus" ADD VALUE IF NOT EXISTS 'PENDING' BEFORE 'PENDING_AI';
ALTER TYPE "ReviewStatus" ADD VALUE IF NOT EXISTS 'MODIFIED' AFTER 'NEEDS_REVIEW';
ALTER TYPE "ReviewStatus" ADD VALUE IF NOT EXISTS 'REJECTED' AFTER 'VALIDATED';
ALTER TYPE "ReviewStatus" ADD VALUE IF NOT EXISTS 'ARCHIVED' AFTER 'REJECTED';
ALTER TYPE "AlertType" ADD VALUE IF NOT EXISTS 'NEW_FIELD_INFORMATION';
ALTER TYPE "AlertType" ADD VALUE IF NOT EXISTS 'DOCUMENT_VALIDATED';
ALTER TYPE "AlertType" ADD VALUE IF NOT EXISTS 'DOCUMENT_REJECTED';
ALTER TYPE "AlertType" ADD VALUE IF NOT EXISTS 'DOCUMENT_MODIFIED';
CREATE TYPE "InformationSourceKind" AS ENUM ('FILE','MANUAL');

ALTER TABLE "documents"
  ADD COLUMN "sourceKind" "InformationSourceKind" NOT NULL DEFAULT 'FILE',
  ADD COLUMN "fieldSource" TEXT,
  ADD COLUMN "confidenceLevel" INTEGER,
  ADD COLUMN "isStrategic" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "attachments" (
  "id" TEXT NOT NULL,
  "documentId" TEXT NOT NULL,
  "uploadedById" TEXT NOT NULL,
  "originalName" TEXT NOT NULL,
  "storageKey" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "size" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "attachments_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "attachments_storageKey_key" ON "attachments"("storageKey");
CREATE INDEX "attachments_documentId_createdAt_idx" ON "attachments"("documentId","createdAt");
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "document_comments" (
  "id" TEXT NOT NULL,
  "documentId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "document_comments_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "document_comments_documentId_createdAt_idx" ON "document_comments"("documentId","createdAt");
ALTER TABLE "document_comments" ADD CONSTRAINT "document_comments_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "document_comments" ADD CONSTRAINT "document_comments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "score_events" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "documentId" TEXT,
  "awardedById" TEXT,
  "points" INTEGER NOT NULL,
  "reason" TEXT NOT NULL,
  "details" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "score_events_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "score_events_userId_createdAt_idx" ON "score_events"("userId","createdAt");
CREATE INDEX "score_events_documentId_idx" ON "score_events"("documentId");
ALTER TABLE "score_events" ADD CONSTRAINT "score_events_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "score_events" ADD CONSTRAINT "score_events_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "documents"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "score_events" ADD CONSTRAINT "score_events_awardedById_fkey" FOREIGN KEY ("awardedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
