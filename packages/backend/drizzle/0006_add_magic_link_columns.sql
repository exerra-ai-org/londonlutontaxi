ALTER TABLE "users" ADD COLUMN "magic_link_token" text;
ALTER TABLE "users" ADD COLUMN "magic_link_expires_at" timestamp;
