-- Secure account recovery and administrator assistance
ALTER TYPE "AlertType" ADD VALUE IF NOT EXISTS 'PASSWORD_RECOVERY_REQUESTED';
ALTER TYPE "AlertType" ADD VALUE IF NOT EXISTS 'PASSWORD_CHANGED';
ALTER TYPE "AlertType" ADD VALUE IF NOT EXISTS 'SUPPORT_REQUEST';

CREATE TABLE "password_reset_tokens" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "usedAt" TIMESTAMP(3),
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "requestedIp" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "password_reset_tokens_tokenHash_key" ON "password_reset_tokens"("tokenHash");
CREATE INDEX "password_reset_tokens_userId_createdAt_idx" ON "password_reset_tokens"("userId","createdAt");
CREATE INDEX "password_reset_tokens_expiresAt_usedAt_idx" ON "password_reset_tokens"("expiresAt","usedAt");
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "support_requests" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "contact" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'OPEN',
  "ipAddress" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "resolvedAt" TIMESTAMP(3),
  CONSTRAINT "support_requests_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "support_requests_status_createdAt_idx" ON "support_requests"("status","createdAt");
