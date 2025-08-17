PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_achievements` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`organization` text,
	`date` text,
	`url` text,
	`display_order` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_achievements`("id", "user_id", "title", "description", "organization", "date", "url", "display_order", "created_at", "updated_at") SELECT "id", "user_id", "title", "description", "organization", "date", "url", "display_order", "created_at", "updated_at" FROM `achievements`;--> statement-breakpoint
DROP TABLE `achievements`;--> statement-breakpoint
ALTER TABLE `__new_achievements` RENAME TO `achievements`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE TABLE `__new_certifications` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`issuing_organization` text NOT NULL,
	`issue_date` text,
	`expiration_date` text,
	`credential_id` text,
	`credential_url` text,
	`display_order` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_certifications`("id", "user_id", "name", "issuing_organization", "issue_date", "expiration_date", "credential_id", "credential_url", "display_order", "created_at", "updated_at") SELECT "id", "user_id", "name", "issuing_organization", "issue_date", "expiration_date", "credential_id", "credential_url", "display_order", "created_at", "updated_at" FROM `certifications`;--> statement-breakpoint
DROP TABLE `certifications`;--> statement-breakpoint
ALTER TABLE `__new_certifications` RENAME TO `certifications`;--> statement-breakpoint
CREATE TABLE `__new_education` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`degree` text NOT NULL,
	`field_of_study` text,
	`institution` text NOT NULL,
	`location` text,
	`start_date` text,
	`end_date` text,
	`gpa` text,
	`honors` text,
	`relevant_coursework` text,
	`display_order` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_education`("id", "user_id", "degree", "field_of_study", "institution", "location", "start_date", "end_date", "gpa", "honors", "relevant_coursework", "display_order", "created_at", "updated_at") SELECT "id", "user_id", "degree", "field_of_study", "institution", "location", "start_date", "end_date", "gpa", "honors", "relevant_coursework", "display_order", "created_at", "updated_at" FROM `education`;--> statement-breakpoint
DROP TABLE `education`;--> statement-breakpoint
ALTER TABLE `__new_education` RENAME TO `education`;--> statement-breakpoint
CREATE TABLE `__new_projects` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`technologies` text,
	`project_url` text,
	`github_url` text,
	`start_date` text,
	`end_date` text,
	`is_ongoing` integer DEFAULT false,
	`display_order` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_projects`("id", "user_id", "title", "description", "technologies", "project_url", "github_url", "start_date", "end_date", "is_ongoing", "display_order", "created_at", "updated_at") SELECT "id", "user_id", "title", "description", "technologies", "project_url", "github_url", "start_date", "end_date", "is_ongoing", "display_order", "created_at", "updated_at" FROM `projects`;--> statement-breakpoint
DROP TABLE `projects`;--> statement-breakpoint
ALTER TABLE `__new_projects` RENAME TO `projects`;--> statement-breakpoint
CREATE TABLE `__new_references` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`title` text,
	`company` text,
	`email` text,
	`phone` text,
	`relationship` text,
	`display_order` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_references`("id", "user_id", "name", "title", "company", "email", "phone", "relationship", "display_order", "created_at", "updated_at") SELECT "id", "user_id", "name", "title", "company", "email", "phone", "relationship", "display_order", "created_at", "updated_at" FROM `references`;--> statement-breakpoint
DROP TABLE `references`;--> statement-breakpoint
ALTER TABLE `__new_references` RENAME TO `references`;--> statement-breakpoint
CREATE TABLE `__new_skills` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`category` text NOT NULL,
	`proficiency_level` text,
	`years_of_experience` integer,
	`display_order` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_skills`("id", "user_id", "name", "category", "proficiency_level", "years_of_experience", "display_order", "created_at", "updated_at") SELECT "id", "user_id", "name", "category", "proficiency_level", "years_of_experience", "display_order", "created_at", "updated_at" FROM `skills`;--> statement-breakpoint
DROP TABLE `skills`;--> statement-breakpoint
ALTER TABLE `__new_skills` RENAME TO `skills`;--> statement-breakpoint
CREATE TABLE `__new_user_profiles` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`first_name` text,
	`last_name` text,
	`email` text,
	`phone` text,
	`address` text,
	`city` text,
	`state` text,
	`zip_code` text,
	`country` text,
	`linkedin_url` text,
	`github_url` text,
	`portfolio_url` text,
	`professional_summary` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_user_profiles`("id", "user_id", "first_name", "last_name", "email", "phone", "address", "city", "state", "zip_code", "country", "linkedin_url", "github_url", "portfolio_url", "professional_summary", "created_at", "updated_at") SELECT "id", "user_id", "first_name", "last_name", "email", "phone", "address", "city", "state", "zip_code", "country", "linkedin_url", "github_url", "portfolio_url", "professional_summary", "created_at", "updated_at" FROM `user_profiles`;--> statement-breakpoint
DROP TABLE `user_profiles`;--> statement-breakpoint
ALTER TABLE `__new_user_profiles` RENAME TO `user_profiles`;--> statement-breakpoint
CREATE UNIQUE INDEX `user_profiles_user_id_unique` ON `user_profiles` (`user_id`);--> statement-breakpoint
CREATE TABLE `__new_work_experiences` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`job_title` text NOT NULL,
	`company` text NOT NULL,
	`location` text,
	`start_date` text NOT NULL,
	`end_date` text,
	`is_current` integer DEFAULT false,
	`description` text,
	`technologies` text,
	`display_order` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_work_experiences`("id", "user_id", "job_title", "company", "location", "start_date", "end_date", "is_current", "description", "technologies", "display_order", "created_at", "updated_at") SELECT "id", "user_id", "job_title", "company", "location", "start_date", "end_date", "is_current", "description", "technologies", "display_order", "created_at", "updated_at" FROM `work_experiences`;--> statement-breakpoint
DROP TABLE `work_experiences`;--> statement-breakpoint
ALTER TABLE `__new_work_experiences` RENAME TO `work_experiences`;