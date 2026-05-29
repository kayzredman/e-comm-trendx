ALTER TABLE "discount_codes" ADD COLUMN "is_promoted" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "discount_codes" ADD COLUMN "promo_label" varchar(140);