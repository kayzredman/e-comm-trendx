CREATE TABLE IF NOT EXISTS "product_variants" (
	"id" varchar(128) PRIMARY KEY NOT NULL,
	"product_id" varchar(128) NOT NULL,
	"size" varchar(64),
	"color" varchar(64),
	"color_hex" varchar(16),
	"attributes" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"sku" varchar(100),
	"price_override" numeric(12, 2),
	"inventory" integer DEFAULT 0 NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "order_items" ADD COLUMN "variant_id" varchar(128);--> statement-breakpoint
ALTER TABLE "order_items" ADD COLUMN "variant_label" varchar(255);