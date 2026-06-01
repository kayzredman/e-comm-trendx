-- Paystack payments — intents + append-only event log (Stripe-style)

DO $$ BEGIN
  CREATE TYPE "payment_provider_type" AS ENUM ('PAYSTACK');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "payment_intent_status" AS ENUM (
    'REQUIRES_AUTH', 'PROCESSING', 'SUCCEEDED', 'FAILED', 'ABANDONED'
  );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "payment_channel" AS ENUM (
    'CARD', 'MOBILE_MONEY', 'BANK', 'USSD', 'QR', 'UNKNOWN'
  );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "payment_intents" (
  "id" varchar(128) PRIMARY KEY NOT NULL,
  "order_id" varchar(128) NOT NULL,
  "provider" "payment_provider_type" NOT NULL DEFAULT 'PAYSTACK',
  "provider_reference" varchar(100) NOT NULL,
  "amount" numeric(12, 2) NOT NULL,
  "currency" varchar(8) NOT NULL DEFAULT 'GHS',
  "channel" "payment_channel" NOT NULL DEFAULT 'UNKNOWN',
  "status" "payment_intent_status" NOT NULL DEFAULT 'REQUIRES_AUTH',
  "authorization_url" text,
  "access_code" varchar(120),
  "last_event_id" varchar(128),
  "metadata" jsonb,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "payment_intents_provider_reference_unique"
  ON "payment_intents" ("provider_reference");
CREATE INDEX IF NOT EXISTS "payment_intents_order_id_idx"
  ON "payment_intents" ("order_id");
CREATE INDEX IF NOT EXISTS "payment_intents_status_updated_at_idx"
  ON "payment_intents" ("status", "updated_at");

CREATE TABLE IF NOT EXISTS "payment_events" (
  "id" varchar(128) PRIMARY KEY NOT NULL,
  "provider" "payment_provider_type" NOT NULL DEFAULT 'PAYSTACK',
  "event_type" varchar(64) NOT NULL,
  "reference" varchar(100),
  "intent_id" varchar(128),
  "order_id" varchar(128),
  "amount" numeric(12, 2),
  "currency" varchar(8),
  "status" varchar(32),
  "raw_payload" jsonb NOT NULL,
  "signature_valid" boolean NOT NULL DEFAULT false,
  "source" varchar(32) NOT NULL DEFAULT 'webhook',
  "webhook_id" varchar(120),
  "processing_error" text,
  "received_at" timestamp NOT NULL DEFAULT now(),
  "processed_at" timestamp
);

CREATE INDEX IF NOT EXISTS "payment_events_reference_idx"
  ON "payment_events" ("reference");
CREATE INDEX IF NOT EXISTS "payment_events_intent_id_idx"
  ON "payment_events" ("intent_id");
CREATE INDEX IF NOT EXISTS "payment_events_order_id_idx"
  ON "payment_events" ("order_id");
CREATE INDEX IF NOT EXISTS "payment_events_received_at_idx"
  ON "payment_events" ("received_at" DESC);
