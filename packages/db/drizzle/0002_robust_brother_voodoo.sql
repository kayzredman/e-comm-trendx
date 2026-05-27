DO $$ BEGIN
 CREATE TYPE "public"."discount_type" AS ENUM('PERCENT', 'FIXED');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."notification_channel" AS ENUM('SMS', 'EMAIL');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."notification_status" AS ENUM('QUEUED', 'SENT', 'FAILED');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."review_status" AS ENUM('PENDING', 'PUBLISHED', 'HIDDEN');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "discount_codes" (
	"id" varchar(128) PRIMARY KEY NOT NULL,
	"code" varchar(64) NOT NULL,
	"type" "discount_type" NOT NULL,
	"value" numeric(12, 2) NOT NULL,
	"min_subtotal" numeric(12, 2) DEFAULT '0' NOT NULL,
	"max_uses" integer,
	"used_count" integer DEFAULT 0 NOT NULL,
	"expires_at" timestamp,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "discount_codes_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "notification_log" (
	"id" varchar(128) PRIMARY KEY NOT NULL,
	"order_id" varchar(128),
	"customer_id" varchar(128),
	"channel" "notification_channel" NOT NULL,
	"template" varchar(64) NOT NULL,
	"recipient" varchar(255) NOT NULL,
	"status" "notification_status" DEFAULT 'QUEUED' NOT NULL,
	"provider_id" varchar(255),
	"error_message" text,
	"payload" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"sent_at" timestamp
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "reviews" (
	"id" varchar(128) PRIMARY KEY NOT NULL,
	"product_id" varchar(128) NOT NULL,
	"customer_id" varchar(128) NOT NULL,
	"order_id" varchar(128),
	"rating" integer NOT NULL,
	"title" varchar(255),
	"body" text,
	"status" "review_status" DEFAULT 'PENDING' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
