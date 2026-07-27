-- Professional commercial offer calculations and comparison
ALTER TABLE "documents" ADD COLUMN "commercialMetadata" JSONB;
ALTER TABLE "intelligence_records"
  ADD COLUMN "ugPercent" DECIMAL(8,2),
  ADD COLUMN "offerBuyQty" INTEGER,
  ADD COLUMN "offerFreeQty" INTEGER,
  ADD COLUMN "offerText" TEXT,
  ADD COLUMN "netPrice" DECIMAL(14,2),
  ADD COLUMN "priceAfterUg" DECIMAL(14,2),
  ADD COLUMN "savings" DECIMAL(14,2);
CREATE INDEX "intelligence_records_discountPercent_idx" ON "intelligence_records"("discountPercent");
CREATE INDEX "intelligence_records_ugPercent_idx" ON "intelligence_records"("ugPercent");
