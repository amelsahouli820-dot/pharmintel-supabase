-- Server-side import drafts with temporary file storage
CREATE TABLE "import_drafts" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "metadata" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "import_drafts_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "import_drafts_userId_updatedAt_idx" ON "import_drafts"("userId","updatedAt");
ALTER TABLE "import_drafts" ADD CONSTRAINT "import_drafts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "import_draft_files" (
  "id" TEXT NOT NULL,
  "draftId" TEXT NOT NULL,
  "originalName" TEXT NOT NULL,
  "storageKey" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "size" INTEGER NOT NULL,
  "sha256" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "import_draft_files_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "import_draft_files_storageKey_key" ON "import_draft_files"("storageKey");
CREATE INDEX "import_draft_files_draftId_idx" ON "import_draft_files"("draftId");
ALTER TABLE "import_draft_files" ADD CONSTRAINT "import_draft_files_draftId_fkey" FOREIGN KEY ("draftId") REFERENCES "import_drafts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
