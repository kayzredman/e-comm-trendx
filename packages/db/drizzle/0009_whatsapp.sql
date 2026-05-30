-- WhatsApp (Baileys) auth-state key/value store

CREATE TABLE IF NOT EXISTS "whatsapp_auth_state" (
  "key" varchar(255) PRIMARY KEY NOT NULL,
  "value" jsonb NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
