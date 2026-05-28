DO $$ BEGIN
 CREATE TYPE "public"."image_source" AS ENUM('upload', 'external');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "product_images" (
	"id" varchar(128) PRIMARY KEY NOT NULL,
	"product_id" varchar(128) NOT NULL,
	"source" "image_source" DEFAULT 'upload' NOT NULL,
	"storage_key" text,
	"external_url" text,
	"width" integer,
	"height" integer,
	"format" varchar(16),
	"byte_size" integer,
	"blur_data_url" text,
	"alt" varchar(255),
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
