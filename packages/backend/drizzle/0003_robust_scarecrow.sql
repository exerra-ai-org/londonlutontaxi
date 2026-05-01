CREATE TABLE IF NOT EXISTS "driver_presence" (
	"driver_id" integer PRIMARY KEY NOT NULL,
	"is_on_duty" boolean DEFAULT false NOT NULL,
	"last_seen_at" timestamp,
	"last_lat" double precision,
	"last_lon" double precision,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "driver_presence" ADD CONSTRAINT "driver_presence_driver_id_users_id_fk" FOREIGN KEY ("driver_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_driver_presence_live" ON "driver_presence" USING btree ("is_on_duty","last_seen_at");