-- Courier PWA: phone-OTP login + session tokens for the rider app

CREATE TABLE IF NOT EXISTS "courier_otps" (
  "id" varchar(128) PRIMARY KEY NOT NULL,
  "phone" varchar(30) NOT NULL,
  "code_hash" varchar(128) NOT NULL,
  "attempts" integer DEFAULT 0 NOT NULL,
  "expires_at" timestamp NOT NULL,
  "consumed_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "courier_otps_phone_idx" ON "courier_otps" ("phone");

CREATE TABLE IF NOT EXISTS "courier_sessions" (
  "id" varchar(128) PRIMARY KEY NOT NULL,
  "courier_id" varchar(128) NOT NULL,
  "token_hash" varchar(128) NOT NULL UNIQUE,
  "user_agent" text,
  "expires_at" timestamp NOT NULL,
  "last_used_at" timestamp DEFAULT now() NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "courier_sessions_courier_id_idx" ON "courier_sessions" ("courier_id");
