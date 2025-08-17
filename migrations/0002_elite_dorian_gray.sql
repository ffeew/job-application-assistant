CREATE TABLE `achievements` (
	`id` text PRIMARY KEY NOT NULL,
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
CREATE TABLE `certifications` (
	`id` text PRIMARY KEY NOT NULL,
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
CREATE TABLE `education` (
	`id` text PRIMARY KEY NOT NULL,
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
CREATE TABLE `projects` (
	`id` text PRIMARY KEY NOT NULL,
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
CREATE TABLE `references` (
	`id` text PRIMARY KEY NOT NULL,
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
CREATE TABLE `skills` (
	`id` text PRIMARY KEY NOT NULL,
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
CREATE TABLE `user_profiles` (
	`id` text PRIMARY KEY NOT NULL,
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
CREATE UNIQUE INDEX `user_profiles_user_id_unique` ON `user_profiles` (`user_id`);--> statement-breakpoint
CREATE TABLE `work_experiences` (
	`id` text PRIMARY KEY NOT NULL,
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
