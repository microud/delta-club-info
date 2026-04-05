CREATE TYPE "public"."video_platform" AS ENUM('BILIBILI', 'DOUYIN');--> statement-breakpoint
CREATE TABLE "bloggers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"platform" "video_platform" NOT NULL,
	"external_id" varchar(200) NOT NULL,
	"name" varchar(200) NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
