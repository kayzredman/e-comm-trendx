DO $$ BEGIN
 CREATE TYPE "public"."order_source" AS ENUM('ONLINE', 'POS');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."pos_hold_status" AS ENUM('HELD', 'RESUMED', 'VOIDED');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."pos_shift_status" AS ENUM('OPEN', 'CLOSED');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
ALTER TYPE "payment_method" ADD VALUE 'CASH';--> statement-breakpoint
ALTER TYPE "user_role" ADD VALUE 'CASHIER';--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "pos_holds" (
	"id" varchar(128) PRIMARY KEY NOT NULL,
	"shift_id" varchar(128) NOT NULL,
	"cashier_id" varchar(128) NOT NULL,
	"customer_id" varchar(128),
	"label" varchar(100),
	"cart" jsonb NOT NULL,
	"status" "pos_hold_status" DEFAULT 'HELD' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"resolved_at" timestamp
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "pos_registers" (
	"id" varchar(128) PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"location" varchar(255),
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "pos_shifts" (
	"id" varchar(128) PRIMARY KEY NOT NULL,
	"register_id" varchar(128) NOT NULL,
	"cashier_id" varchar(128) NOT NULL,
	"status" "pos_shift_status" DEFAULT 'OPEN' NOT NULL,
	"opening_float" numeric(12, 2) DEFAULT '0' NOT NULL,
	"closing_cash" numeric(12, 2),
	"expected_cash" numeric(12, 2),
	"cash_variance" numeric(12, 2),
	"notes" text,
	"opened_at" timestamp DEFAULT now() NOT NULL,
	"closed_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "orders" ALTER COLUMN "customer_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "source" "order_source" DEFAULT 'ONLINE' NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "discount_amount" numeric(12, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "discount_reason" varchar(255);--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "tax_amount" numeric(12, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "cashier_id" varchar(128);--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "shift_id" varchar(128);--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "register_id" varchar(128);--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "tendered_amount" numeric(12, 2);--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "change_amount" numeric(12, 2);--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "momo_reference" varchar(64);--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "card_last4" varchar(4);--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "receipt_number" varchar(32);