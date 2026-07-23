-- Apply the new enum value in a separate transaction after it has been committed
ALTER TABLE "documents" ALTER COLUMN "reviewStatus" SET DEFAULT 'PENDING';
