ALTER TABLE "payment_intents"
  ADD COLUMN IF NOT EXISTS "dispute_status" varchar(48),
  ADD COLUMN IF NOT EXISTS "dispute_updated_at" timestamp;
