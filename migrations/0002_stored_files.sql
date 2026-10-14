CREATE TABLE "resume_uploads" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"file_name" text NOT NULL,
	"mime_type" text NOT NULL,
	"size_bytes" integer NOT NULL,
	"storage_key" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	CONSTRAINT "resume_uploads_storage_key_unique" UNIQUE("storage_key")
);
--> statement-breakpoint
ALTER TABLE "resumes" ADD COLUMN "pdf_key" text;--> statement-breakpoint
ALTER TABLE "resume_uploads" ADD CONSTRAINT "resume_uploads_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "resume_uploads_user_idx" ON "resume_uploads" USING btree ("user_id","created_at");