import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { ApplicationsService } from "@/app/api/applications/service";
import { ResumeGenerationService } from "@/app/api/resume-generation/service";
import { ResumesService } from "@/app/api/resumes/service";
import { jobApplicationResumeRequestSchema } from "@/app/api/profile/validators";
import { z } from "zod";

const applicationsService = new ApplicationsService();
const resumeGenerationService = new ResumeGenerationService();
const resumesService = new ResumesService();

// Schema for saving tailored resume
const saveTailoredResumeSchema = z.object({
  title: z.string().min(1, "Title is required"),
  content: z.string().min(1, "Content is required"),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: applicationId } = await params;
    const body = await request.json();
    const validatedRequest = jobApplicationResumeRequestSchema.parse({
      ...body,
      applicationId,
    });

    const application = await applicationsService.getApplicationById(
      session.user.id,
      applicationId,
    );

    if (!application) {
      return NextResponse.json({ error: "Application not found" }, { status: 404 });
    }

    if (validatedRequest.useAISelection && !application.jobDescription) {
      return NextResponse.json(
        { error: "Job description is required for AI-powered resume generation" },
        { status: 400 },
      );
    }

    const format = new URL(request.url).searchParams.get("format") ?? "html";

    if (format === "pdf") {
      const { pdf } =
        await resumeGenerationService.generateJobApplicationResumePDF(
          session.user.id,
          application,
          validatedRequest,
        );

      return new Response(Uint8Array.from(pdf), {
        status: 200,
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="${validatedRequest.title.replace(/[^a-zA-Z0-9]/g, "_")}_${application.company.replace(/[^a-zA-Z0-9]/g, "_")}.pdf"`,
        },
      });
    }

    if (format === "preview") {
      const { html, aiSelection } =
        await resumeGenerationService.generateJobApplicationPreviewHTML(
          session.user.id,
          application,
          validatedRequest,
        );

      return NextResponse.json({
        html,
        aiSelection,
        application: {
          id: application.id,
          company: application.company,
          position: application.position,
        },
      });
    }

    const { html, aiSelection } =
      await resumeGenerationService.generateJobApplicationResumeHTML(
        session.user.id,
        application,
        validatedRequest,
      );

    return NextResponse.json({
      html,
      aiSelection,
      application: {
        id: application.id,
        company: application.company,
        position: application.position,
      },
    });
  } catch (error) {
    console.error("Error generating job application resume:", error);
    return NextResponse.json(
      { error: "Failed to generate resume" },
      { status: 500 },
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: applicationId } = await params;
    const application = await applicationsService.getApplicationById(
      session.user.id,
      applicationId,
    );

    if (!application) {
      return NextResponse.json({ error: "Application not found" }, { status: 404 });
    }

    // Check if a tailored resume already exists for this application
    const existingTailoredResume = await resumesService.getTailoredResumeByApplication(
      session.user.id,
      applicationId,
    );

    return NextResponse.json({
      id: application.id,
      company: application.company,
      position: application.position,
      jobDescription: application.jobDescription,
      hasJobDescription: !!application.jobDescription,
      location: application.location,
      status: application.status,
      tailoredResume: existingTailoredResume ? {
        id: existingTailoredResume.id,
        title: existingTailoredResume.title,
        updatedAt: existingTailoredResume.updatedAt,
      } : null,
    });
  } catch (error) {
    console.error("Error fetching application for resume generation:", error);
    return NextResponse.json(
      { error: "Failed to fetch application" },
      { status: 500 },
    );
  }
}

// Save (or update) tailored resume for this job application
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: applicationId } = await params;
    const body = await request.json();
    const validatedData = saveTailoredResumeSchema.parse(body);

    // Verify the application exists and belongs to the user
    const application = await applicationsService.getApplicationById(
      session.user.id,
      applicationId,
    );

    if (!application) {
      return NextResponse.json({ error: "Application not found" }, { status: 404 });
    }

    // Check if a tailored resume already exists for this application
    const existingResume = await resumesService.getTailoredResumeByApplication(
      session.user.id,
      applicationId,
    );

    let resume;
    if (existingResume) {
      // Update existing tailored resume
      resume = await resumesService.updateResume(
        session.user.id,
        existingResume.id,
        {
          title: validatedData.title,
          content: validatedData.content,
        },
      );
    } else {
      // Create new tailored resume
      resume = await resumesService.createResume(session.user.id, {
        title: validatedData.title,
        content: validatedData.content,
        isDefault: false,
        jobApplicationId: applicationId,
        isTailored: true,
      });
    }

    return NextResponse.json({
      success: true,
      resume: {
        id: resume?.id,
        title: resume?.title,
        isTailored: resume?.isTailored,
        jobApplicationId: resume?.jobApplicationId,
        updatedAt: resume?.updatedAt,
      },
      isNew: !existingResume,
    });
  } catch (error) {
    console.error("Error saving tailored resume:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", details: error.issues },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { error: "Failed to save tailored resume" },
      { status: 500 },
    );
  }
}
