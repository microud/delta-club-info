ALTER TABLE "clubs" ADD COLUMN "order_posters" text[] DEFAULT '{}';--> statement-breakpoint
ALTER TABLE "club_services" ADD COLUMN "images" text[] DEFAULT '{}';