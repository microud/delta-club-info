CREATE TYPE "public"."parse_task_status" AS ENUM('pending', 'parsing', 'completed', 'failed');--> statement-breakpoint
CREATE TABLE "wechat_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"msg_id" varchar(64) NOT NULL,
	"msg_type" varchar(20) NOT NULL,
	"content" text,
	"media_url" varchar(500),
	"from_user" varchar(100) NOT NULL,
	"raw_payload" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "parse_task_messages" (
	"parse_task_id" uuid NOT NULL,
	"wechat_message_id" uuid NOT NULL,
	CONSTRAINT "parse_task_messages_parse_task_id_wechat_message_id_pk" PRIMARY KEY("parse_task_id","wechat_message_id")
);
--> statement-breakpoint
CREATE TABLE "parse_tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"status" "parse_task_status" DEFAULT 'pending' NOT NULL,
	"club_id" uuid,
	"parsed_result" jsonb,
	"error_message" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_configs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100) NOT NULL,
	"provider" varchar(50) NOT NULL,
	"api_key" text NOT NULL,
	"base_url" varchar(500),
	"model" varchar(200) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "clubs" ADD COLUMN "company_name" varchar(300);--> statement-breakpoint
ALTER TABLE "clubs" ADD COLUMN "credit_code" varchar(18);--> statement-breakpoint
ALTER TABLE "clubs" ADD COLUMN "legal_person" varchar(100);--> statement-breakpoint
ALTER TABLE "clubs" ADD COLUMN "registered_address" text;--> statement-breakpoint
ALTER TABLE "clubs" ADD COLUMN "business_scope" text;--> statement-breakpoint
ALTER TABLE "clubs" ADD COLUMN "registered_capital" varchar(100);--> statement-breakpoint
ALTER TABLE "clubs" ADD COLUMN "company_established_at" date;--> statement-breakpoint
ALTER TABLE "clubs" ADD COLUMN "business_status" varchar(50);--> statement-breakpoint
ALTER TABLE "parse_task_messages" ADD CONSTRAINT "parse_task_messages_parse_task_id_parse_tasks_id_fk" FOREIGN KEY ("parse_task_id") REFERENCES "public"."parse_tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "parse_task_messages" ADD CONSTRAINT "parse_task_messages_wechat_message_id_wechat_messages_id_fk" FOREIGN KEY ("wechat_message_id") REFERENCES "public"."wechat_messages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "parse_tasks" ADD CONSTRAINT "parse_tasks_club_id_clubs_id_fk" FOREIGN KEY ("club_id") REFERENCES "public"."clubs"("id") ON DELETE set null ON UPDATE no action;