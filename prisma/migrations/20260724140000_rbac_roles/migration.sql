-- Role-based access control: Director General, Supervisor and Delegate
ALTER TYPE "Role" RENAME VALUE 'USER' TO 'DELEGATE';
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'DIRECTOR_GENERAL' AFTER 'ADMIN';
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'SUPERVISOR' AFTER 'DIRECTOR_GENERAL';

ALTER TABLE "users" ADD COLUMN "supervisorId" TEXT;
CREATE INDEX "users_supervisorId_idx" ON "users"("supervisorId");
ALTER TABLE "users" ADD CONSTRAINT "users_supervisorId_fkey" FOREIGN KEY ("supervisorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
