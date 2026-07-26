-- Multilingual interface and user language preference
ALTER TABLE "users" ADD COLUMN "locale" TEXT NOT NULL DEFAULT 'fr';
CREATE TABLE "app_languages" (
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "nativeName" TEXT NOT NULL,
  "direction" TEXT NOT NULL DEFAULT 'ltr',
  "active" BOOLEAN NOT NULL DEFAULT true,
  "isDefault" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "app_languages_pkey" PRIMARY KEY ("code")
);
CREATE TABLE "ui_translations" (
  "id" TEXT NOT NULL,
  "languageCode" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "value" TEXT NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ui_translations_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ui_translations_languageCode_key_key" ON "ui_translations"("languageCode","key");
CREATE INDEX "ui_translations_languageCode_idx" ON "ui_translations"("languageCode");
ALTER TABLE "ui_translations" ADD CONSTRAINT "ui_translations_languageCode_fkey" FOREIGN KEY ("languageCode") REFERENCES "app_languages"("code") ON DELETE CASCADE ON UPDATE CASCADE;
INSERT INTO "app_languages" ("code","name","nativeName","direction","active","isDefault","updatedAt") VALUES
('fr','Français','Français','ltr',true,true,CURRENT_TIMESTAMP),
('en','English','English','ltr',true,false,CURRENT_TIMESTAMP),
('ar','Arabe','العربية','rtl',true,false,CURRENT_TIMESTAMP),
('it','Italiano','Italiano','ltr',true,false,CURRENT_TIMESTAMP)
ON CONFLICT ("code") DO NOTHING;
