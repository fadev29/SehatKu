ALTER TABLE "User"
ADD COLUMN IF NOT EXISTS "monitorClinicId" TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'User_monitorClinicId_fkey'
  ) THEN
    ALTER TABLE "User"
    ADD CONSTRAINT "User_monitorClinicId_fkey"
    FOREIGN KEY ("monitorClinicId") REFERENCES "Clinic"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "User_monitorClinicId_idx" ON "User"("monitorClinicId");
