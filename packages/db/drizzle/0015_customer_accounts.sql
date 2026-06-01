ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "clerk_user_id" varchar(128);
--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "saved_addresses" jsonb;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "customers_clerk_user_id_unique"
  ON "customers" ("clerk_user_id")
  WHERE "clerk_user_id" IS NOT NULL;
