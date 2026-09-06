-- Add the assigned approver without changing existing approval history.
ALTER TABLE "approvals"
ADD COLUMN IF NOT EXISTS "approverId" UUID;

CREATE INDEX IF NOT EXISTS "approvals_approverId_approvalDecision_idx"
ON "approvals"("approverId", "approvalDecision");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'approvals_approverId_fkey'
  ) THEN
    ALTER TABLE "approvals"
    ADD CONSTRAINT "approvals_approverId_fkey"
    FOREIGN KEY ("approverId") REFERENCES "users"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;