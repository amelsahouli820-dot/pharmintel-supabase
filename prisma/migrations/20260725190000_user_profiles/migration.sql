-- Self-managed user profiles, contact details and notification preferences
ALTER TABLE "users"
  ADD COLUMN "firstName" TEXT,
  ADD COLUMN "lastName" TEXT,
  ADD COLUMN "jobTitle" TEXT,
  ADD COLUMN "service" TEXT,
  ADD COLUMN "personalEmail" TEXT,
  ADD COLUMN "personalPhone" TEXT,
  ADD COLUMN "messagingApps" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "notificationPreferences" JSONB NOT NULL DEFAULT '{"professionalEmail":true,"personalEmail":false,"whatsapp":false,"viber":false,"telegram":false,"sms":false}',
  ADD COLUMN "urgentAlerts" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "avatarStorageKey" TEXT,
  ADD COLUMN "avatarMime" TEXT;

UPDATE "users" SET "firstName"=split_part("name",' ',1), "lastName"=NULLIF(trim(substring("name" from length(split_part("name",' ',1))+1)),'') WHERE "firstName" IS NULL;
