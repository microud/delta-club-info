CREATE TYPE "public"."club_status" AS ENUM('draft', 'published', 'closed', 'archived');--> statement-breakpoint
CREATE TABLE "clubs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(200) NOT NULL,
	"logo" varchar(500),
	"description" text,
	"wechat_official_account" varchar(200),
	"wechat_mini_program" varchar(200),
	"contact_info" varchar(500),
	"status" "club_status" DEFAULT 'draft' NOT NULL,
	"established_at" date,
	"closed_at" date,
	"predecessor_id" uuid,
	"closure_note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
