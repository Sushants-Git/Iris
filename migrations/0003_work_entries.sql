CREATE TABLE "work_entries" (
  "id" text PRIMARY KEY NOT NULL,
  "title" text NOT NULL,
  "tag" text NOT NULL,
  "started_at" timestamp NOT NULL,
  "ended_at" timestamp,
  "total_paused_ms" integer NOT NULL DEFAULT 0,
  "created_at" timestamp DEFAULT now() NOT NULL
);
