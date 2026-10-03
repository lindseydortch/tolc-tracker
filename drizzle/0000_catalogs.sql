CREATE TYPE "public"."stack_layer" AS ENUM('frontendFramework', 'backendFramework', 'backendLanguage', 'database');--> statement-breakpoint
CREATE TABLE "skill_aliases" (
	"id" serial PRIMARY KEY NOT NULL,
	"skill_id" integer NOT NULL,
	"name" text NOT NULL,
	"normalized_name" text NOT NULL,
	CONSTRAINT "skill_aliases_normalized_name_unique" UNIQUE("normalized_name")
);
--> statement-breakpoint
CREATE TABLE "skills" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"normalized_name" text NOT NULL,
	"suggested_layer" "stack_layer",
	CONSTRAINT "skills_normalized_name_unique" UNIQUE("normalized_name")
);
--> statement-breakpoint
CREATE TABLE "target_role_aliases" (
	"id" serial PRIMARY KEY NOT NULL,
	"target_role_id" integer NOT NULL,
	"name" text NOT NULL,
	"normalized_name" text NOT NULL,
	CONSTRAINT "target_role_aliases_normalized_name_unique" UNIQUE("normalized_name")
);
--> statement-breakpoint
CREATE TABLE "target_roles" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"normalized_name" text NOT NULL,
	CONSTRAINT "target_roles_normalized_name_unique" UNIQUE("normalized_name")
);
--> statement-breakpoint
ALTER TABLE "skill_aliases" ADD CONSTRAINT "skill_aliases_skill_id_skills_id_fk" FOREIGN KEY ("skill_id") REFERENCES "public"."skills"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "target_role_aliases" ADD CONSTRAINT "target_role_aliases_target_role_id_target_roles_id_fk" FOREIGN KEY ("target_role_id") REFERENCES "public"."target_roles"("id") ON DELETE cascade ON UPDATE no action;