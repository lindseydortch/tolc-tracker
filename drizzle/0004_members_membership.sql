ALTER TABLE "members" ADD COLUMN "hidden" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "members" ADD COLUMN "membership_checked_at" timestamp;--> statement-breakpoint
ALTER TABLE "members" ADD COLUMN "membership_attempted_at" timestamp;