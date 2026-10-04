ALTER TABLE "members" ADD COLUMN "membership_passed_at" timestamp;--> statement-breakpoint
-- `hidden` used to mean "Discord said not in TOLC" and is now set only by the
-- Admin (ADR 0003). A Member last answered "in TOLC" has passed; everyone
-- else is unhidden and checked again until they pass.
UPDATE "members" SET "membership_passed_at" = "membership_checked_at", "membership_checked_at" = NULL WHERE NOT "hidden" AND "membership_checked_at" IS NOT NULL;--> statement-breakpoint
UPDATE "members" SET "hidden" = false WHERE "hidden";
