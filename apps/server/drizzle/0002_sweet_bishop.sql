CREATE TYPE "public"."club_service_type" AS ENUM('KNIFE_RUN', 'ACCOMPANY', 'ESCORT_TRIAL', 'ESCORT_STANDARD', 'ESCORT_FUN');--> statement-breakpoint
CREATE TYPE "public"."rule_sentiment" AS ENUM('FAVORABLE', 'UNFAVORABLE', 'NEUTRAL');--> statement-breakpoint
CREATE TABLE "club_services" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"club_id" uuid NOT NULL,
	"type" "club_service_type" NOT NULL,
	"price_yuan" numeric(10, 2),
	"price_hafu_coin" numeric(10, 2),
	"tier" varchar(100),
	"price_per_hour" numeric(10, 2),
	"game_name" varchar(200),
	"has_guarantee" boolean,
	"guarantee_hafu_coin" numeric(10, 2),
	"rules" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "club_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"club_id" uuid NOT NULL,
	"content" text NOT NULL,
	"ai_analysis" json,
	"sentiment" "rule_sentiment" DEFAULT 'NEUTRAL' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "promotion_orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"club_id" uuid NOT NULL,
	"fee" numeric(10, 2) NOT NULL,
	"start_at" date NOT NULL,
	"end_at" date NOT NULL,
	"daily_rate" numeric(10, 4) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "club_services" ADD CONSTRAINT "club_services_club_id_clubs_id_fk" FOREIGN KEY ("club_id") REFERENCES "public"."clubs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "club_rules" ADD CONSTRAINT "club_rules_club_id_clubs_id_fk" FOREIGN KEY ("club_id") REFERENCES "public"."clubs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "promotion_orders" ADD CONSTRAINT "promotion_orders_club_id_clubs_id_fk" FOREIGN KEY ("club_id") REFERENCES "public"."clubs"("id") ON DELETE cascade ON UPDATE no action;