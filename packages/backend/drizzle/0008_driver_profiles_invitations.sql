ALTER TABLE "users" ADD COLUMN "invitation_token" text;
ALTER TABLE "users" ADD COLUMN "invitation_token_expires_at" timestamp;
ALTER TABLE "users" ADD COLUMN "profile_picture_url" text;

CREATE TABLE "driver_profiles" (
  "driver_id" integer PRIMARY KEY REFERENCES "users"("id"),
  "vehicle_make" text,
  "vehicle_model" text,
  "vehicle_year" integer,
  "vehicle_color" text,
  "license_plate" text,
  "vehicle_class" "vehicle_class",
  "bio" text
);
