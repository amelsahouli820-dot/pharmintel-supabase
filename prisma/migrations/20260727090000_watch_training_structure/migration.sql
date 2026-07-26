-- Watch classification, training management and internal communication
ALTER TYPE "ReferenceEntityType" ADD VALUE IF NOT EXISTS 'WATCH_TYPE' BEFORE 'OTHER';
ALTER TYPE "AlertType" ADD VALUE IF NOT EXISTS 'TRAINING_INVITATION';
ALTER TYPE "AlertType" ADD VALUE IF NOT EXISTS 'TRAINING_REMINDER';
ALTER TYPE "AlertType" ADD VALUE IF NOT EXISTS 'COMMUNICATION_PUBLISHED';
CREATE TYPE "TrainingMode" AS ENUM ('IN_PERSON','REMOTE','HYBRID');
CREATE TYPE "TrainingStatus" AS ENUM ('DRAFT','PUBLISHED','CANCELLED','COMPLETED');
CREATE TYPE "ParticipationStatus" AS ENUM ('PENDING','ACCEPTED','DECLINED');
CREATE TYPE "CommunicationType" AS ENUM ('SERVICE_NOTE','PROCEDURE','DIRECTION_INFO','NEW_PRODUCT','INTERNAL_PROMOTION','EVENT','NEWS');

ALTER TABLE "documents" ADD COLUMN "watchTypeId" TEXT, ADD COLUMN "customWatchType" TEXT;
CREATE INDEX "documents_watchTypeId_createdAt_idx" ON "documents"("watchTypeId","createdAt");
ALTER TABLE "documents" ADD CONSTRAINT "documents_watchTypeId_fkey" FOREIGN KEY ("watchTypeId") REFERENCES "reference_entities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "trainings" ("id" TEXT NOT NULL,"title" TEXT NOT NULL,"description" TEXT NOT NULL,"objectives" TEXT NOT NULL,"trainer" TEXT NOT NULL,"startsAt" TIMESTAMP(3) NOT NULL,"durationMinutes" INTEGER NOT NULL,"mode" "TrainingMode" NOT NULL,"meetingProvider" TEXT,"meetingUrl" TEXT,"location" TEXT,"status" "TrainingStatus" NOT NULL DEFAULT 'PUBLISHED',"audienceRole" "Role","audienceRegion" TEXT,"createdById" TEXT NOT NULL,"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,"updatedAt" TIMESTAMP(3) NOT NULL,CONSTRAINT "trainings_pkey" PRIMARY KEY ("id"));
CREATE INDEX "trainings_startsAt_status_idx" ON "trainings"("startsAt","status");
ALTER TABLE "trainings" ADD CONSTRAINT "trainings_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE TABLE "training_invitations" ("id" TEXT NOT NULL,"trainingId" TEXT NOT NULL,"userId" TEXT NOT NULL,"status" "ParticipationStatus" NOT NULL DEFAULT 'PENDING',"declineReason" TEXT,"respondedAt" TIMESTAMP(3),"reminderSentAt" TIMESTAMP(3),"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,CONSTRAINT "training_invitations_pkey" PRIMARY KEY ("id"));
CREATE UNIQUE INDEX "training_invitations_trainingId_userId_key" ON "training_invitations"("trainingId","userId");
CREATE INDEX "training_invitations_userId_status_idx" ON "training_invitations"("userId","status");
ALTER TABLE "training_invitations" ADD CONSTRAINT "training_invitations_trainingId_fkey" FOREIGN KEY ("trainingId") REFERENCES "trainings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "training_invitations" ADD CONSTRAINT "training_invitations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE TABLE "training_attachments" ("id" TEXT NOT NULL,"trainingId" TEXT NOT NULL,"name" TEXT NOT NULL,"storageKey" TEXT,"mimeType" TEXT,"size" INTEGER,"externalUrl" TEXT,"downloadCount" INTEGER NOT NULL DEFAULT 0,"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,CONSTRAINT "training_attachments_pkey" PRIMARY KEY ("id"));
CREATE INDEX "training_attachments_trainingId_idx" ON "training_attachments"("trainingId");
ALTER TABLE "training_attachments" ADD CONSTRAINT "training_attachments_trainingId_fkey" FOREIGN KEY ("trainingId") REFERENCES "trainings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE TABLE "communications" ("id" TEXT NOT NULL,"type" "CommunicationType" NOT NULL,"title" TEXT NOT NULL,"content" TEXT NOT NULL,"priority" "PriorityLevel" NOT NULL DEFAULT 'NORMAL',"authorId" TEXT NOT NULL,"publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,"updatedAt" TIMESTAMP(3) NOT NULL,CONSTRAINT "communications_pkey" PRIMARY KEY ("id"));
CREATE INDEX "communications_publishedAt_type_idx" ON "communications"("publishedAt","type");
ALTER TABLE "communications" ADD CONSTRAINT "communications_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE TABLE "communication_attachments" ("id" TEXT NOT NULL,"communicationId" TEXT NOT NULL,"name" TEXT NOT NULL,"storageKey" TEXT,"mimeType" TEXT,"size" INTEGER,"externalUrl" TEXT,"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,CONSTRAINT "communication_attachments_pkey" PRIMARY KEY ("id"));
CREATE INDEX "communication_attachments_communicationId_idx" ON "communication_attachments"("communicationId");
ALTER TABLE "communication_attachments" ADD CONSTRAINT "communication_attachments_communicationId_fkey" FOREIGN KEY ("communicationId") REFERENCES "communications"("id") ON DELETE CASCADE ON UPDATE CASCADE;
