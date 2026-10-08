CREATE TYPE "public"."work_arrangement" AS ENUM('remote', 'hybrid', 'inPerson');--> statement-breakpoint
CREATE TABLE "member_wants_to_work_from" (
	"id" serial PRIMARY KEY NOT NULL,
	"member_id" integer NOT NULL,
	"city" text NOT NULL,
	"region" text NOT NULL,
	"country" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "member_work_arrangements" (
	"member_id" integer NOT NULL,
	"work_arrangement" "work_arrangement" NOT NULL,
	CONSTRAINT "member_work_arrangements_member_id_work_arrangement_pk" PRIMARY KEY("member_id","work_arrangement")
);
--> statement-breakpoint
ALTER TABLE "members" ADD COLUMN "city" text;--> statement-breakpoint
ALTER TABLE "members" ADD COLUMN "region" text;--> statement-breakpoint
ALTER TABLE "members" ADD COLUMN "country" text;--> statement-breakpoint
ALTER TABLE "members" ADD COLUMN "time_zone" text;--> statement-breakpoint
ALTER TABLE "members" ADD COLUMN "willing_to_relocate" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "member_wants_to_work_from" ADD CONSTRAINT "member_wants_to_work_from_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_work_arrangements" ADD CONSTRAINT "member_work_arrangements_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;