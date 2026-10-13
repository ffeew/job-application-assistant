-- Applications deleted before this migration left their resumes pointing at
-- nothing, which the new foreign key would reject.
UPDATE "resumes" SET "job_application_id" = NULL
WHERE "job_application_id" IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM "job_applications"
    WHERE "job_applications"."id" = "resumes"."job_application_id"
  );--> statement-breakpoint
-- The default was switched without a transaction, so an account may hold more
-- than one. The most recently updated default is kept for the unique index.
UPDATE "resumes" SET "is_default" = false
WHERE "is_default"
  AND "id" NOT IN (
    SELECT DISTINCT ON ("user_id") "id" FROM "resumes"
    WHERE "is_default"
    ORDER BY "user_id", "updated_at" DESC, "id"
  );--> statement-breakpoint
ALTER TABLE "resumes" ADD CONSTRAINT "resumes_job_application_id_job_applications_id_fk" FOREIGN KEY ("job_application_id") REFERENCES "public"."job_applications"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "achievements_user_idx" ON "achievements" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "certifications_user_idx" ON "certifications" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "cover_letters_user_idx" ON "cover_letters" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "cover_letters_application_idx" ON "cover_letters" USING btree ("job_application_id");--> statement-breakpoint
CREATE INDEX "education_user_idx" ON "education" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "job_applications_user_idx" ON "job_applications" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "projects_user_idx" ON "projects" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "references_user_idx" ON "references" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "resumes_user_idx" ON "resumes" USING btree ("user_id","updated_at");--> statement-breakpoint
CREATE INDEX "resumes_application_idx" ON "resumes" USING btree ("job_application_id");--> statement-breakpoint
CREATE UNIQUE INDEX "resumes_one_default_per_user" ON "resumes" USING btree ("user_id") WHERE "resumes"."is_default";--> statement-breakpoint
CREATE INDEX "skills_user_idx" ON "skills" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "work_experiences_user_idx" ON "work_experiences" USING btree ("user_id");