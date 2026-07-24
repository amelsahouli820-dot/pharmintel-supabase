-- Governance, session control, soft deletion, document transfer and internal messaging
ALTER TYPE "UserStatus" ADD VALUE IF NOT EXISTS 'INACTIVE' AFTER 'ACTIVE';
ALTER TYPE "UserStatus" ADD VALUE IF NOT EXISTS 'REFUSED' AFTER 'SUSPENDED';
ALTER TYPE "UserStatus" ADD VALUE IF NOT EXISTS 'DELETED' AFTER 'REFUSED';
ALTER TYPE "AlertType" ADD VALUE IF NOT EXISTS 'ACCOUNT_ACCEPTED';
ALTER TYPE "AlertType" ADD VALUE IF NOT EXISTS 'ACCOUNT_REFUSED';
ALTER TYPE "AlertType" ADD VALUE IF NOT EXISTS 'ROLE_CHANGED';
ALTER TYPE "AlertType" ADD VALUE IF NOT EXISTS 'PASSWORD_RESET';
ALTER TYPE "AlertType" ADD VALUE IF NOT EXISTS 'SECURITY_LOGIN_FAILED';
ALTER TYPE "AlertType" ADD VALUE IF NOT EXISTS 'NEW_MESSAGE';
ALTER TYPE "AlertType" ADD VALUE IF NOT EXISTS 'SYSTEM_ANNOUNCEMENT';
ALTER TYPE "AlertType" ADD VALUE IF NOT EXISTS 'DOCUMENT_IMPORTED';
ALTER TYPE "AlertType" ADD VALUE IF NOT EXISTS 'INFORMATION_PENDING';
ALTER TYPE "AlertType" ADD VALUE IF NOT EXISTS 'IMPORT_ERROR';

ALTER TABLE "users" ADD COLUMN "phone" TEXT, ADD COLUMN "deletedAt" TIMESTAMP(3);
ALTER TABLE "documents" ADD COLUMN "assignedToId" TEXT;
CREATE INDEX "documents_assignedToId_createdAt_idx" ON "documents"("assignedToId","createdAt");
ALTER TABLE "documents" DROP CONSTRAINT "documents_userId_fkey";
ALTER TABLE "documents" ADD CONSTRAINT "documents_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "documents" ADD CONSTRAINT "documents_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "sessions" ("id" TEXT NOT NULL,"tokenId" TEXT NOT NULL,"userId" TEXT NOT NULL,"ipAddress" TEXT,"userAgent" TEXT,"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,"lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,"expiresAt" TIMESTAMP(3) NOT NULL,"revokedAt" TIMESTAMP(3),CONSTRAINT "sessions_pkey" PRIMARY KEY ("id"));
CREATE UNIQUE INDEX "sessions_tokenId_key" ON "sessions"("tokenId");
CREATE INDEX "sessions_userId_revokedAt_expiresAt_idx" ON "sessions"("userId","revokedAt","expiresAt");
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "messages" ("id" TEXT NOT NULL,"senderId" TEXT NOT NULL,"recipientId" TEXT NOT NULL,"subject" TEXT NOT NULL,"content" TEXT NOT NULL,"documentId" TEXT,"readAt" TIMESTAMP(3),"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,CONSTRAINT "messages_pkey" PRIMARY KEY ("id"));
CREATE INDEX "messages_recipientId_readAt_createdAt_idx" ON "messages"("recipientId","readAt","createdAt");
CREATE INDEX "messages_senderId_createdAt_idx" ON "messages"("senderId","createdAt");
ALTER TABLE "messages" ADD CONSTRAINT "messages_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "messages" ADD CONSTRAINT "messages_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
