CREATE TYPE "public"."item_type" AS ENUM('link', 'note');--> statement-breakpoint
CREATE TYPE "public"."status" AS ENUM('pending', 'done');--> statement-breakpoint
CREATE TABLE "boards" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"board_id" uuid NOT NULL,
	"type" "item_type" NOT NULL,
	"url" text,
	"scraped_title" text,
	"scraped_description" text,
	"scraped_thumbnail" text,
	"custom_title" text,
	"custom_description" text,
	"custom_thumbnail" text,
	"note_content" text,
	"x" real DEFAULT 100 NOT NULL,
	"y" real DEFAULT 100 NOT NULL,
	"width" real DEFAULT 320 NOT NULL,
	"height" real DEFAULT 200 NOT NULL,
	"status" "status" DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "items" ADD CONSTRAINT "items_board_id_boards_id_fk" FOREIGN KEY ("board_id") REFERENCES "public"."boards"("id") ON DELETE cascade ON UPDATE no action;