ALTER TABLE "users" ADD COLUMN "reset_password_token" text;
ALTER TABLE "users" ADD COLUMN "reset_password_expires_at" timestamp;
