CREATE TYPE "public"."content_platform" AS ENUM('BILIBILI', 'DOUYIN', 'XIAOHONGSHU', 'WECHAT_CHANNELS', 'WECHAT_MP');--> statement-breakpoint
CREATE TYPE "public"."crawl_category" AS ENUM('REVIEW', 'SENTIMENT');--> statement-breakpoint
CREATE TYPE "public"."crawl_task_run_status" AS ENUM('RUNNING', 'SUCCESS', 'FAILED');--> statement-breakpoint
CREATE TYPE "public"."crawl_task_type_v2" AS ENUM('BLOGGER_POSTS', 'KEYWORD_SEARCH', 'MP_ARTICLES');--> statement-breakpoint
CREATE TYPE "public"."content_category" AS ENUM('REVIEW', 'SENTIMENT', 'ANNOUNCEMENT');--> statement-breakpoint
CREATE TYPE "public"."content_type" AS ENUM('VIDEO', 'NOTE', 'ARTICLE');--> statement-breakpoint
CREATE TABLE "blogger_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"blogger_id" uuid NOT NULL,
	"platform" "content_platform" NOT NULL,
	"platform_user_id" varchar(200) NOT NULL,
	"platform_username" varchar(200),
	"crawl_categories" "crawl_category"[] DEFAULT '{}' NOT NULL,
	"last_crawled_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "crawl_task_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"crawl_task_id" uuid NOT NULL,
	"status" "crawl_task_run_status" DEFAULT 'RUNNING' NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone,
	"items_fetched" integer DEFAULT 0 NOT NULL,
	"items_created" integer DEFAULT 0 NOT NULL,
	"error_message" text
);
--> statement-breakpoint
CREATE TABLE "crawl_tasks_v2" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"task_type" "crawl_task_type_v2" NOT NULL,
	"category" varchar(50) NOT NULL,
	"platform" "content_platform" NOT NULL,
	"target_id" varchar(500) NOT NULL,
	"cron_expression" varchar(100) DEFAULT '0 */1 * * *' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"last_run_at" timestamp with time zone,
	"next_run_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"platform" "content_platform" NOT NULL,
	"content_type" "content_type" NOT NULL,
	"category" "content_category" NOT NULL,
	"external_id" varchar(500) NOT NULL,
	"external_url" varchar(1000),
	"title" varchar(500) NOT NULL,
	"description" text,
	"cover_url" varchar(1000),
	"author_name" varchar(200),
	"published_at" timestamp with time zone,
	"blogger_id" uuid,
	"club_id" uuid,
	"group_id" uuid,
	"is_primary" boolean DEFAULT true NOT NULL,
	"group_platforms" "content_platform"[],
	"ai_parsed" boolean DEFAULT false NOT NULL,
	"ai_club_match" varchar(200),
	"ai_summary" text,
	"ai_sentiment" "ai_sentiment",
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "clubs" ADD COLUMN "wechat_mp_ghid" varchar(100);--> statement-breakpoint
ALTER TABLE "bloggers" ADD COLUMN "avatar" varchar(1000);--> statement-breakpoint
ALTER TABLE "bloggers" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "blogger_accounts" ADD CONSTRAINT "blogger_accounts_blogger_id_bloggers_id_fk" FOREIGN KEY ("blogger_id") REFERENCES "public"."bloggers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crawl_task_runs" ADD CONSTRAINT "crawl_task_runs_crawl_task_id_crawl_tasks_v2_id_fk" FOREIGN KEY ("crawl_task_id") REFERENCES "public"."crawl_tasks_v2"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contents" ADD CONSTRAINT "contents_blogger_id_bloggers_id_fk" FOREIGN KEY ("blogger_id") REFERENCES "public"."bloggers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contents" ADD CONSTRAINT "contents_club_id_clubs_id_fk" FOREIGN KEY ("club_id") REFERENCES "public"."clubs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "blogger_accounts_platform_user_id_idx" ON "blogger_accounts" USING btree ("platform","platform_user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "contents_platform_external_id_idx" ON "contents" USING btree ("platform","external_id");--> statement-breakpoint
CREATE INDEX "contents_is_primary_idx" ON "contents" USING btree ("is_primary");--> statement-breakpoint
CREATE INDEX "contents_group_id_idx" ON "contents" USING btree ("group_id");--> statement-breakpoint
CREATE INDEX "contents_category_idx" ON "contents" USING btree ("category");--> statement-breakpoint
CREATE INDEX "contents_published_at_idx" ON "contents" USING btree ("published_at");--> statement-breakpoint
ALTER TABLE "bloggers" DROP COLUMN "platform";--> statement-breakpoint
ALTER TABLE "bloggers" DROP COLUMN "external_id";