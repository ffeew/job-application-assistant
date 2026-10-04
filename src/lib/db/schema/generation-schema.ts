import {
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { user } from "./auth-schema";
import { jobApplications } from "./app-schema";

export const resumeGenerationJobs = pgTable(
  "resume_generation_jobs",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    applicationId: text("application_id").references(() => jobApplications.id, {
      onDelete: "cascade",
    }),
    payload: jsonb("payload").$type<unknown>().notNull(),
    status: text("status", {
      enum: ["queued", "running", "completed", "failed"],
    })
      .notNull()
      .default("queued"),
    result: jsonb("result").$type<unknown>(),
    error: text("error"),
    savedResumeId: text("saved_resume_id"),
    attempts: integer("attempts").notNull().default(0),
    claimToken: text("claim_token"),
    leaseExpiresAt: timestamp("lease_expires_at", {
      withTimezone: true,
      mode: "date",
    }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
    finishedAt: timestamp("finished_at", { withTimezone: true, mode: "date" }),
  },
  (table) => [
    index("generation_jobs_queue_idx").on(table.status, table.createdAt),
    index("generation_jobs_owner_idx").on(
      table.userId,
      table.applicationId,
      table.createdAt,
    ),
  ],
);
