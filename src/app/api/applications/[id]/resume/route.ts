import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { ApplicationsService } from "@/app/api/applications/service";
import { ResumeGenerationService } from "@/app/api/resume-generation/service";
import { jobApplicationResumeRequestSchema } from "@/app/api/profile/validators";

const applicationsService = new ApplicationsService();
const resumeGenerationService = new ResumeGenerationService();

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
      const { pdf, aiSelection } =
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
          "X-AI-Selection": aiSelection ? JSON.stringify(aiSelection) : "",
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

    return NextResponse.json({
      id: application.id,
      company: application.company,
      position: application.position,
      jobDescription: application.jobDescription,
      hasJobDescription: !!application.jobDescription,
      location: application.location,
      status: application.status,
    });
  } catch (error) {
    console.error("Error fetching application for resume generation:", error);
    return NextResponse.json(
      { error: "Failed to fetch application" },
      { status: 500 },
    );
  }
}
