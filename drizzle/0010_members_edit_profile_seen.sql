ALTER TABLE "members" ADD COLUMN "edit_profile_seen_at" timestamp;--> statement-breakpoint
-- Members who signed up before the Edit Profile prompt shipped count as
-- having seen it, so only new signups get the nav dot.
UPDATE "members" SET "edit_profile_seen_at" = now() WHERE "first_name" IS NOT NULL;
