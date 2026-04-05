ALTER TABLE "bookings" ADD COLUMN "pickup_lat" double precision;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "pickup_lon" double precision;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "dropoff_lat" double precision;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "dropoff_lon" double precision;--> statement-breakpoint
ALTER TABLE "zones" ADD COLUMN "boundary" jsonb;--> statement-breakpoint
ALTER TABLE "zones" ADD COLUMN "center_lat" double precision;--> statement-breakpoint
ALTER TABLE "zones" ADD COLUMN "center_lon" double precision;