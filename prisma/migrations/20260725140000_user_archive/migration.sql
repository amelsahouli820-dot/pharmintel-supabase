-- User archive / recycle bin with preserved business history
ALTER TYPE "UserStatus" ADD VALUE IF NOT EXISTS 'ARCHIVED' AFTER 'REFUSED';
ALTER TABLE "users" ADD COLUMN "archivedAt" TIMESTAMP(3), ADD COLUMN "archiveReason" TEXT, ADD COLUMN "previousRole" "Role";
CREATE INDEX "users_status_archivedAt_idx" ON "users"("status","archivedAt");
