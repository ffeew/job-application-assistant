import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { ResumeGenerationService } from "@/lib/services/resume-generation.service";
import { ApplicationsService } from "@/lib/services/applications.service";
import { jobApplicationResumeRequestSchema } from "@/lib/validators/profile.validator";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; }>; }
) {
  try {
    // Check authentication
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get application ID from params
    const { id: applicationId } = await params;

    // Parse and validate request body
    const body = await request.json();
    const validatedRequest = jobApplicationResumeRequestSchema.parse({
      ...body,
      applicationId,
    });

    // Get the application
    const applicationsService = new ApplicationsService();
    const application = await applicationsService.getApplicationById(session.user.id, applicationId);

    if (!application) {
      return NextResponse.json({ error: "Application not found" }, { status: 404 });
    }

    // Check if application has job description for AI generation
    if (validatedRequest.useAISelection && !application.jobDescription) {
      return NextResponse.json(
        { error: "Job description is required for AI-powered resume generation" },
        { status: 400 }
      );
    }

    // Generate resume
    const resumeService = new ResumeGenerationService();
    const format = new URL(request.url).searchParams.get('format') || 'html';

    if (format === 'pdf') {
      const { pdf, aiSelection } = await resumeService.generateJobApplicationResumePDF(
        session.user.id,
        application,
        validatedRequest
      );

      return new Response(new Uint8Array(pdf), {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${validatedRequest.title.replace(/[^a-zA-Z0-9]/g, '_')}_${application.company.replace(/[^a-zA-Z0-9]/g, '_')}.pdf"`,
          'X-AI-Selection': aiSelection ? JSON.stringify(aiSelection) : '',
        },
      });
    } else if (format === 'preview') {
      const { html, aiSelection } = await resumeService.generateJobApplicationPreviewHTML(
        session.user.id,
        application,
        validatedRequest
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
    } else {
      const { html, aiSelection } = await resumeService.generateJobApplicationResumeHTML(
        session.user.id,
        application,
        validatedRequest
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
  } catch (error) {
    console.error("Error generating job application resume:", error);
    return NextResponse.json(
      { error: "Failed to generate resume" },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; }>; }
) {
  try {
    // Check authentication
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get application ID from params
    const { id: applicationId } = await params;

    // Get the application and return basic info for resume generation form
    const applicationsService = new ApplicationsService();
    const application = await applicationsService.getApplicationById(session.user.id, applicationId);

    if (!application) {
      return NextResponse.json({ error: "Application not found" }, { status: 404 });
    }

    // Return application info needed for resume generation
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
      { status: 500 }
    );
  }
}