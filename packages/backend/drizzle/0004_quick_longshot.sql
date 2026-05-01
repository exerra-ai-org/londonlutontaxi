CREATE TABLE IF NOT EXISTS "driver_location_points" (
	"id" serial PRIMARY KEY NOT NULL,
	"booking_id" integer NOT NULL,
	"driver_id" integer NOT NULL,
	"lat" double precision NOT NULL,
	"lon" double precision NOT NULL,
	"accuracy_m" double precision,
	"speed_mps" double precision,
	"recorded_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "snapped_path" jsonb;--> statement-breakpoint
ALTER TABLE "driver_heartbeats" ADD COLUMN "pickup_geofence_since" timestamp;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "driver_location_points" ADD CONSTRAINT "driver_location_points_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "driver_location_points" ADD CONSTRAINT "driver_location_points_driver_id_users_id_fk" FOREIGN KEY ("driver_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_dlp_booking_recorded" ON "driver_location_points" USING btree ("booking_id","recorded_at");