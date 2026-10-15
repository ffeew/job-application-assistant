import { sql } from "drizzle-orm";
import {
  pgTable,
  text,
  integer,
  boolean,
  timestamp,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { user } from "./auth-schema";

export const resumes = pgTable(
  "resumes",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    content: text("content").notNull(),
    isDefault: boolean("is_default").default(false),
    // A saved resume outlives the application it was tailored for; only the
    // link is removed with the application.
    jobApplicationId: text("job_application_id").references(
      () => jobApplications.id,
      { onDelete: "set null" },
    ),
    isTailored: boolean("is_tailored").default(false),
    // The stored PDF for this exact content, when one was kept. It is cleared
    // whenever the content changes without a new PDF to go with it.
    pdfKey: text("pdf_key"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .$defaultFn(() => new Date())
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
      .$defaultFn(() => new Date())
      .notNull(),
  },
  (table) => [
    index("resumes_user_idx").on(table.userId, table.updatedAt),
    index("resumes_application_idx").on(table.jobApplicationId),
    uniqueIndex("resumes_one_default_per_user")
      .on(table.userId)
      .where(sql`${table.isDefault}`),
  ],
);

export const jobApplications = pgTable(
  "job_applications",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    company: text("company").notNull(),
    position: text("position").notNull(),
    jobDescription: text("job_description"),
    location: text("location"),
    jobUrl: text("job_url"),
    salaryRange: text("salary_range"),
    status: text("status").notNull().default("applied"),
    appliedAt: timestamp("applied_at", { withTimezone: true, mode: "date" }),
    notes: text("notes"),
    contactEmail: text("contact_email"),
    contactName: text("contact_name"),
    recruiterId: text("recruiter_id"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .$defaultFn(() => new Date())
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
      .$defaultFn(() => new Date())
      .notNull(),
  },
  (table) => [
    index("job_applications_user_idx").on(table.userId, table.createdAt),
  ],
);

export const coverLetters = pgTable(
  "cover_letters",
  {
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
    content: text("content").notNull(),
    isAiGenerated: boolean("is_ai_generated").default(false),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .$defaultFn(() => new Date())
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
      .$defaultFn(() => new Date())
      .notNull(),
  },
  (table) => [
    index("cover_letters_user_idx").on(table.userId, table.createdAt),
    index("cover_letters_application_idx").on(table.jobApplicationId),
  ],
);

export const applicationStatuses = pgTable("application_statuses", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  jobApplicationId: text("job_application_id")
    .notNull()
    .references(() => jobApplications.id, { onDelete: "cascade" }),
  status: text("status").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
    .$defaultFn(() => new Date())
    .notNull(),
});

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

export const resumeUploads = pgTable(
  "resume_uploads",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    fileName: text("file_name").notNull(),
    mimeType: text("mime_type").notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    storageKey: text("storage_key").notNull().unique(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .$defaultFn(() => new Date())
      .notNull(),
  },
  (table) => [
    index("resume_uploads_user_idx").on(table.userId, table.createdAt),
  ],
);

export const workExperiences = pgTable(
  "work_experiences",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    jobTitle: text("job_title").notNull(),
    company: text("company").notNull(),
    location: text("location"),
    startDate: text("start_date").notNull(),
    endDate: text("end_date"),
    isCurrent: boolean("is_current").notNull().default(false),
    description: text("description"),
    technologies: text("technologies"),
    displayOrder: integer("display_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .$defaultFn(() => new Date())
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
      .$defaultFn(() => new Date())
      .notNull(),
  },
  (table) => [index("work_experiences_user_idx").on(table.userId)],
);

export const education = pgTable(
  "education",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    degree: text("degree").notNull(),
    fieldOfStudy: text("field_of_study"),
    institution: text("institution").notNull(),
    location: text("location"),
    startDate: text("start_date"),
    endDate: text("end_date"),
    gpa: text("gpa"),
    honors: text("honors"),
    relevantCoursework: text("relevant_coursework"),
    displayOrder: integer("display_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .$defaultFn(() => new Date())
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
      .$defaultFn(() => new Date())
      .notNull(),
  },
  (table) => [index("education_user_idx").on(table.userId)],
);

export const skills = pgTable(
  "skills",
  {
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
  },
  (table) => [index("skills_user_idx").on(table.userId)],
);

export const projects = pgTable(
  "projects",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description"),
    technologies: text("technologies"),
    projectUrl: text("project_url"),
    githubUrl: text("github_url"),
    startDate: text("start_date"),
    endDate: text("end_date"),
    isOngoing: boolean("is_ongoing").notNull().default(false),
    displayOrder: integer("display_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .$defaultFn(() => new Date())
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
      .$defaultFn(() => new Date())
      .notNull(),
  },
  (table) => [index("projects_user_idx").on(table.userId)],
);

export const certifications = pgTable(
  "certifications",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    issuingOrganization: text("issuing_organization").notNull(),
    issueDate: text("issue_date"),
    expirationDate: text("expiration_date"),
    credentialId: text("credential_id"),
    credentialUrl: text("credential_url"),
    displayOrder: integer("display_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .$defaultFn(() => new Date())
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
      .$defaultFn(() => new Date())
      .notNull(),
  },
  (table) => [index("certifications_user_idx").on(table.userId)],
);

export const achievements = pgTable(
  "achievements",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description"),
    organization: text("organization"),
    date: text("date"),
    url: text("url"),
    displayOrder: integer("display_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .$defaultFn(() => new Date())
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
      .$defaultFn(() => new Date())
      .notNull(),
  },
  (table) => [index("achievements_user_idx").on(table.userId)],
);

export const references = pgTable(
  "references",
  {
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
  },
  (table) => [index("references_user_idx").on(table.userId)],
);
