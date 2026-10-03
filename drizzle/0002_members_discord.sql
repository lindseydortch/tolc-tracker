ALTER TABLE "members" ADD COLUMN "discord_user_id" text;--> statement-breakpoint
ALTER TABLE "members" ADD COLUMN "discord_handle" text;--> statement-breakpoint
ALTER TABLE "members" ADD CONSTRAINT "members_discord_user_id_unique" UNIQUE("discord_user_id");