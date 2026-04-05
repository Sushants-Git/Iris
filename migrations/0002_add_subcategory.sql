ALTER TYPE "item_type" ADD VALUE IF NOT EXISTS 'subcategory';
--> statement-breakpoint
ALTER TABLE "items" ADD COLUMN "subcategory" text;
