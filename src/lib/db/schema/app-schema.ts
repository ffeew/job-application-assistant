import {
  pgTable,
  text,
  integer,
  boolean,
  timestamp,
} from "drizzle-orm/pg-core";
import { user } from "./auth-schema";

export const resumes = pgTable("resumes", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  content: text("content").notNull(), // JSON string containing resume data
  isDefault: boolean("is_default").default(false),
  jobApplicationId: text("job_application_id"), // Linked job application for tailored resumes (FK added after jobApplications defined)
  isTailored: boolean("is_tailored").default(false),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
    .$defaultFn(() => new Date())
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
    .$defaultFn(() => new Date())
    .notNull(),
});

export const jobApplications = pgTable("job_applications", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
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
  appliedAt: timestamp("applied_at", { withTimezone: true, mode: "date" }),
  notes: text("notes"), // User's personal notes about the application
  contactEmail: text("contact_email"),
  contactName: text("contact_name"),
  recruiterId: text("recruiter_id"), // If applicable
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
    .$defaultFn(() => new Date())
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
    .$defaultFn(() => new Date())
    .notNull(),
});

export const coverLetters = pgTable("cover_letters", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  jobApplicationId: text("job_application_id").references(
    () => jobApplications.id,
    { onDelete: "cascade" },
  ),
  resumeId: text("resume_id").references(() => resumes.id, {
    onDelete: "set null",
  }),
  title: text("title").notNull(),
  content: text("content").notNull(), // The actual cover letter text
  isAiGenerated: boolean("is_ai_generated").default(false),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
    .$defaultFn(() => new Date())
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
    .$defaultFn(() => new Date())
    .notNull(),
});

export const applicationStatuses = pgTable("application_statuses", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  jobApplicationId: text("job_application_id")
    .notNull()
    .references(() => jobApplications.id, { onDelete: "cascade" }),
  status: text("status").notNull(), // Status change
  notes: text("notes"), // Optional notes about this status change
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
    .$defaultFn(() => new Date())
    .notNull(),
});

// User Profile System - Structured data for resume generation
export const userProfiles = pgTable("user_profiles", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  userId: text("user_id")
    .notNull()
    .unique()
    .references(() => user.id, { onDelete: "cascade" }),
  firstName: text("first_name"),
  lastName: text("last_name"),
  email: text("email"),
  phone: text("phone"),
  address: text("address"),
  city: text("city"),
  state: text("state"),
  zipCode: text("zip_code"),
  country: text("country"),
  linkedinUrl: text("linkedin_url"),
  githubUrl: text("github_url"),
  portfolioUrl: text("portfolio_url"),
  professionalSummary: text("professional_summary"),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
    .$defaultFn(() => new Date())
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
    .$defaultFn(() => new Date())
    .notNull(),
});

export const workExperiences = pgTable("work_experiences", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  jobTitle: text("job_title").notNull(),
  company: text("company").notNull(),
  location: text("location"),
  startDate: text("start_date").notNull(), // YYYY-MM format
  endDate: text("end_date"), // YYYY-MM format, null for current
  isCurrent: boolean("is_current").notNull().default(false),
  description: text("description"), // Job responsibilities and achievements
  technologies: text("technologies"), // Comma-separated or JSON array
  displayOrder: integer("display_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
    .$defaultFn(() => new Date())
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
    .$defaultFn(() => new Date())
    .notNull(),
});

export const education = pgTable("education", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  degree: text("degree").notNull(),
  fieldOfStudy: text("field_of_study"),
  institution: text("institution").notNull(),
  location: text("location"),
  startDate: text("start_date"), // YYYY-MM format
  endDate: text("end_date"), // YYYY-MM format
  gpa: text("gpa"),
  honors: text("honors"), // Dean's List, Magna Cum Laude, etc.
  relevantCoursework: text("relevant_coursework"),
  displayOrder: integer("display_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
    .$defaultFn(() => new Date())
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
    .$defaultFn(() => new Date())
    .notNull(),
});

export const skills = pgTable("skills", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  category: text("category", {
    enum: ["technical", "soft", "language", "tool", "framework", "other"],
  }).notNull(),
  proficiencyLevel: text("proficiency_level", {
    enum: ["beginner", "intermediate", "advanced", "expert"],
  }),
  yearsOfExperience: integer("years_of_experience"),
  displayOrder: integer("display_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
    .$defaultFn(() => new Date())
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
    .$defaultFn(() => new Date())
    .notNull(),
});

export const projects = pgTable("projects", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  technologies: text("technologies"), // Comma-separated or JSON array
  projectUrl: text("project_url"),
  githubUrl: text("github_url"),
  startDate: text("start_date"), // YYYY-MM format
  endDate: text("end_date"), // YYYY-MM format
  isOngoing: boolean("is_ongoing").notNull().default(false),
  displayOrder: integer("display_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
    .$defaultFn(() => new Date())
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
    .$defaultFn(() => new Date())
    .notNull(),
});

export const certifications = pgTable("certifications", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  issuingOrganization: text("issuing_organization").notNull(),
  issueDate: text("issue_date"), // YYYY-MM format
  expirationDate: text("expiration_date"), // YYYY-MM format
  credentialId: text("credential_id"),
  credentialUrl: text("credential_url"),
  displayOrder: integer("display_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
    .$defaultFn(() => new Date())
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
    .$defaultFn(() => new Date())
    .notNull(),
});

export const achievements = pgTable("achievements", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  organization: text("organization"),
  date: text("date"), // YYYY-MM format
  url: text("url"), // Link to award or recognition
  displayOrder: integer("display_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
    .$defaultFn(() => new Date())
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
    .$defaultFn(() => new Date())
    .notNull(),
});

export const references = pgTable("references", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  title: text("title"),
  company: text("company"),
  email: text("email"),
  phone: text("phone"),
  relationship: text("relationship", {
    enum: ["manager", "colleague", "client", "professor", "mentor", "other"],
  }),
  displayOrder: integer("display_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
    .$defaultFn(() => new Date())
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
    .$defaultFn(() => new Date())
    .notNull(),
});
