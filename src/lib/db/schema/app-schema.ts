import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { user } from "./auth-schema";

export const resumes = sqliteTable("resumes", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  content: text("content").notNull(), // JSON string containing resume data
  isDefault: integer("is_default", { mode: "boolean" }).default(false),
  createdAt: integer("created_at", { mode: "timestamp" })
    .$defaultFn(() => new Date())
    .notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .$defaultFn(() => new Date())
    .notNull(),
});

export const jobApplications = sqliteTable("job_applications", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  company: text("company").notNull(),
  position: text("position").notNull(),
  jobDescription: text("job_description"), // The full job posting description
  location: text("location"),
  jobUrl: text("job_url"), // Link to original job posting
  salaryRange: text("salary_range"),
  status: text("status").notNull().default("applied"), // applied, interviewing, rejected, offer, withdrawn
  appliedAt: integer("applied_at", { mode: "timestamp" }),
  notes: text("notes"), // User's personal notes about the application
  contactEmail: text("contact_email"),
  contactName: text("contact_name"),
  recruiterId: text("recruiter_id"), // If applicable
  createdAt: integer("created_at", { mode: "timestamp" })
    .$defaultFn(() => new Date())
    .notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .$defaultFn(() => new Date())
    .notNull(),
});

export const coverLetters = sqliteTable("cover_letters", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  jobApplicationId: text("job_application_id")
    .references(() => jobApplications.id, { onDelete: "cascade" }),
  resumeId: text("resume_id")
    .references(() => resumes.id, { onDelete: "set null" }),
  title: text("title").notNull(),
  content: text("content").notNull(), // The actual cover letter text
  isAiGenerated: integer("is_ai_generated", { mode: "boolean" }).default(false),
  createdAt: integer("created_at", { mode: "timestamp" })
    .$defaultFn(() => new Date())
    .notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .$defaultFn(() => new Date())
    .notNull(),
});

export const applicationStatuses = sqliteTable("application_statuses", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  jobApplicationId: text("job_application_id")
    .notNull()
    .references(() => jobApplications.id, { onDelete: "cascade" }),
  status: text("status").notNull(), // Status change
  notes: text("notes"), // Optional notes about this status change
  createdAt: integer("created_at", { mode: "timestamp" })
    .$defaultFn(() => new Date())
    .notNull(),
});