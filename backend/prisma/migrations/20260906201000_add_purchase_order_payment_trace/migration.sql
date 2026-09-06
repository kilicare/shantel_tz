ALTER TABLE "payments"
ADD COLUMN IF NOT EXISTS "purchaseOrderId" UUID;

CREATE INDEX IF NOT EXISTS "payments_purchaseOrderId_idx"
ON "payments"("purchaseOrderId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'payments_purchaseOrderId_fkey'
  ) THEN
    ALTER TABLE "payments"
    ADD CONSTRAINT "payments_purchaseOrderId_fkey"
    FOREIGN KEY ("purchaseOrderId") REFERENCES "purchase_orders"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;