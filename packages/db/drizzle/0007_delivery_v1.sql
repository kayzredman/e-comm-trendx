-- Delivery v1: prepay gate, courier roster, assignments, events, payouts, manual MoMo verification

-- New enums
DO $$ BEGIN
  CREATE TYPE "payment_status" AS ENUM ('PENDING','PAID','FAILED','REFUNDED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "courier_type" AS ENUM ('FLEET','FREELANCE');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "assignment_status" AS ENUM ('ASSIGNED','PICKED_UP','DELIVERED','FAILED','CANCELLED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "delivery_event_type" AS ENUM (
    'CREATED','CONFIRMED','PROCESSING','READY_FOR_PICKUP',
    'ASSIGNED','PICKED_UP','OUT_FOR_DELIVERY','DELIVERED',
    'FAILED','CANCELLED','PAYMENT_VERIFIED','PAYMENT_REJECTED','NOTE'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "payment_verification_status" AS ENUM ('PENDING','VERIFIED','REJECTED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "payout_method" AS ENUM ('MOMO','CASH','BANK');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "payment_provider" AS ENUM ('MTN_MOMO','VODAFONE_CASH','AIRTELTIGO','BANK','OTHER');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Extend order_status with READY_FOR_PICKUP (ordered before OUT_FOR_DELIVERY)
ALTER TYPE "order_status" ADD VALUE IF NOT EXISTS 'READY_FOR_PICKUP' BEFORE 'OUT_FOR_DELIVERY';--> statement-breakpoint

-- Orders: payment + delivery code + zone link
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "payment_status" "payment_status" NOT NULL DEFAULT 'PENDING';--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "paid_at" timestamp;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "zone_id" varchar(128);--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "delivery_code" varchar(8);--> statement-breakpoint

-- Delivery zones: prepay gate
ALTER TABLE "delivery_zones" ADD COLUMN IF NOT EXISTS "requires_prepayment" boolean NOT NULL DEFAULT false;--> statement-breakpoint

-- Couriers
CREATE TABLE IF NOT EXISTS "couriers" (
  "id" varchar(128) PRIMARY KEY NOT NULL,
  "name" varchar(255) NOT NULL,
  "phone" varchar(30) NOT NULL,
  "employment_type" "courier_type" NOT NULL DEFAULT 'FREELANCE',
  "commission_pct" numeric(5,2) NOT NULL DEFAULT '15',
  "flat_per_delivery" numeric(10,2),
  "vehicle" varchar(120),
  "momo_number" varchar(30),
  "is_active" boolean NOT NULL DEFAULT true,
  "notes" text,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);--> statement-breakpoint

-- Delivery assignments (courier <-> order)
CREATE TABLE IF NOT EXISTS "delivery_assignments" (
  "id" varchar(128) PRIMARY KEY NOT NULL,
  "order_id" varchar(128) NOT NULL,
  "courier_id" varchar(128) NOT NULL,
  "status" "assignment_status" NOT NULL DEFAULT 'ASSIGNED',
  "delivery_fee" numeric(12,2) NOT NULL,
  "commission_amount" numeric(12,2) NOT NULL DEFAULT '0',
  "assigned_by" varchar(128),
  "assigned_at" timestamp NOT NULL DEFAULT now(),
  "picked_up_at" timestamp,
  "delivered_at" timestamp,
  "failed_at" timestamp,
  "failure_reason" text,
  "payout_id" varchar(128)
);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "delivery_assignments_order_idx" ON "delivery_assignments" ("order_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "delivery_assignments_courier_idx" ON "delivery_assignments" ("courier_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "delivery_assignments_status_idx" ON "delivery_assignments" ("status");--> statement-breakpoint

-- Delivery events (append-only audit + tracking spine)
CREATE TABLE IF NOT EXISTS "delivery_events" (
  "id" varchar(128) PRIMARY KEY NOT NULL,
  "order_id" varchar(128) NOT NULL,
  "type" "delivery_event_type" NOT NULL,
  "actor_id" varchar(128),
  "actor_name" varchar(255),
  "courier_id" varchar(128),
  "note" text,
  "created_at" timestamp NOT NULL DEFAULT now()
);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "delivery_events_order_idx" ON "delivery_events" ("order_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "delivery_events_created_idx" ON "delivery_events" ("created_at" DESC);--> statement-breakpoint

-- Payouts (settled commission per courier per period)
CREATE TABLE IF NOT EXISTS "payouts" (
  "id" varchar(128) PRIMARY KEY NOT NULL,
  "courier_id" varchar(128) NOT NULL,
  "amount" numeric(12,2) NOT NULL,
  "method" "payout_method" NOT NULL DEFAULT 'MOMO',
  "reference" varchar(120),
  "period_from" timestamp NOT NULL,
  "period_to" timestamp NOT NULL,
  "delivery_count" integer NOT NULL DEFAULT 0,
  "paid_by" varchar(128),
  "paid_at" timestamp NOT NULL DEFAULT now(),
  "notes" text,
  "created_at" timestamp NOT NULL DEFAULT now()
);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "payouts_courier_idx" ON "payouts" ("courier_id");--> statement-breakpoint

-- Payment verifications (manual MoMo screenshot review)
CREATE TABLE IF NOT EXISTS "payment_verifications" (
  "id" varchar(128) PRIMARY KEY NOT NULL,
  "order_id" varchar(128) NOT NULL,
  "amount" numeric(12,2) NOT NULL,
  "provider" "payment_provider" NOT NULL,
  "provider_ref" varchar(120),
  "from_phone" varchar(30),
  "screenshot_url" text,
  "status" "payment_verification_status" NOT NULL DEFAULT 'PENDING',
  "verified_by" varchar(128),
  "verified_at" timestamp,
  "rejection_reason" text,
  "created_at" timestamp NOT NULL DEFAULT now()
);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "payment_verifications_order_idx" ON "payment_verifications" ("order_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "payment_verifications_status_idx" ON "payment_verifications" ("status");
