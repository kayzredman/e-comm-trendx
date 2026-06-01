ALTER TABLE "payment_intents"
  ADD COLUMN IF NOT EXISTS "refunded_amount" numeric(12,2) NOT NULL DEFAULT '0';
