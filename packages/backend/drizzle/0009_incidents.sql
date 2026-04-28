CREATE TABLE "incidents" (
  "id" serial PRIMARY KEY NOT NULL,
  "booking_id" integer NOT NULL,
  "reporter_id" integer NOT NULL,
  "type" text NOT NULL DEFAULT 'contact_admin',
  "message" text,
  "resolved" boolean NOT NULL DEFAULT false,
  "created_at" timestamp NOT NULL DEFAULT now()
);

ALTER TABLE "incidents" ADD CONSTRAINT "incidents_booking_id_bookings_id_fk"
  FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "incidents" ADD CONSTRAINT "incidents_reporter_id_users_id_fk"
  FOREIGN KEY ("reporter_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;
