CREATE TYPE "public"."ai_sentiment" AS ENUM('POSITIVE', 'NEGATIVE', 'NEUTRAL');--> statement-breakpoint
CREATE TYPE "public"."video_category" AS ENUM('REVIEW', 'SENTIMENT');--> statement-breakpoint
CREATE TYPE "public"."crawl_task_status" AS ENUM('RUNNING', 'SUCCESS', 'FAILED');--> statement-breakpoint
CREATE TYPE "public"."crawl_task_type" AS ENUM('BLOGGER', 'KEYWORD');--> statement-breakpoint
CREATE TABLE "videos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"club_id" uuid,
	"platform" "video_platform" NOT NULL,
	"external_id" varchar(200) NOT NULL,
	"title" varchar(500) NOT NULL,
	"cover_url" varchar(1000) NOT NULL,
	"video_url" varchar(1000) NOT NULL,
	"description" text,
	"author_name" varchar(200) NOT NULL,
	"author_id" varchar(200) NOT NULL,
	"category" "video_category" NOT NULL,
	"subtitle_text" text,
	"ai_parsed" boolean DEFAULT false NOT NULL,
	"ai_club_match" varchar(200),
	"ai_summary" text,
	"ai_sentiment" "ai_sentiment",
	"published_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "crawl_tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" "crawl_task_type" NOT NULL,
	"target_id" varchar(500) NOT NULL,
	"status" "crawl_task_status" DEFAULT 'RUNNING' NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone,
	"video_count" integer DEFAULT 0 NOT NULL,
	"error_message" text
);
--> statement-breakpoint
ALTER TABLE "videos" ADD CONSTRAINT "videos_club_id_clubs_id_fk" FOREIGN KEY ("club_id") REFERENCES "public"."clubs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "videos_platform_external_id_idx" ON "videos" USING btree ("platform","external_id");