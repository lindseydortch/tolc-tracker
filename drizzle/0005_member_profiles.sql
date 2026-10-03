CREATE TYPE "public"."job_search_status" AS ENUM('activelyLooking', 'employedAndLooking', 'employedOpenToOffers', 'notLooking');--> statement-breakpoint
CREATE TYPE "public"."seniority" AS ENUM('junior', 'mid', 'senior', 'staffPlus');--> statement-breakpoint
CREATE TABLE "member_seniorities" (
	"member_id" integer NOT NULL,
	"seniority" "seniority" NOT NULL,
	"preferred" boolean NOT NULL,
	CONSTRAINT "member_seniorities_member_id_seniority_pk" PRIMARY KEY("member_id","seniority")
);
--> statement-breakpoint
CREATE TABLE "member_skills" (
	"member_id" integer NOT NULL,
	"skill_id" integer NOT NULL,
	"stack_layer" "stack_layer",
	CONSTRAINT "member_skills_member_id_skill_id_pk" PRIMARY KEY("member_id","skill_id")
);
--> statement-breakpoint
CREATE TABLE "member_target_roles" (
	"member_id" integer NOT NULL,
	"target_role_id" integer NOT NULL,
	CONSTRAINT "member_target_roles_member_id_target_role_id_pk" PRIMARY KEY("member_id","target_role_id")
);
--> statement-breakpoint
ALTER TABLE "members" ADD COLUMN "first_name" text;--> statement-breakpoint
ALTER TABLE "members" ADD COLUMN "last_name" text;--> statement-breakpoint
ALTER TABLE "members" ADD COLUMN "job_search_status" "job_search_status";--> statement-breakpoint
ALTER TABLE "member_seniorities" ADD CONSTRAINT "member_seniorities_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_skills" ADD CONSTRAINT "member_skills_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_skills" ADD CONSTRAINT "member_skills_skill_id_skills_id_fk" FOREIGN KEY ("skill_id") REFERENCES "public"."skills"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_target_roles" ADD CONSTRAINT "member_target_roles_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_target_roles" ADD CONSTRAINT "member_target_roles_target_role_id_target_roles_id_fk" FOREIGN KEY ("target_role_id") REFERENCES "public"."target_roles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "member_seniorities_one_preferred" ON "member_seniorities" USING btree ("member_id") WHERE "member_seniorities"."preferred";--> statement-breakpoint
CREATE UNIQUE INDEX "member_skills_one_per_layer" ON "member_skills" USING btree ("member_id","stack_layer") WHERE "member_skills"."stack_layer" is not null;