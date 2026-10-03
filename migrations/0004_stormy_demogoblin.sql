DROP INDEX "user_profiles_user_id_unique";--> statement-breakpoint
DROP INDEX "session_token_unique";--> statement-breakpoint
DROP INDEX "user_email_unique";--> statement-breakpoint
ALTER TABLE `projects` ALTER COLUMN "is_ongoing" TO "is_ongoing" integer NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `user_profiles_user_id_unique` ON `user_profiles` (`user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `session_token_unique` ON `session` (`token`);--> statement-breakpoint
CREATE UNIQUE INDEX `user_email_unique` ON `user` (`email`);--> statement-breakpoint
ALTER TABLE `work_experiences` ALTER COLUMN "is_current" TO "is_current" integer NOT NULL;--> statement-breakpoint
ALTER TABLE `resumes` ADD `job_application_id` text;--> statement-breakpoint
ALTER TABLE `resumes` ADD `is_tailored` integer DEFAULT false;