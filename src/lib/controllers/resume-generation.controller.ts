import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { ResumeGenerationService } from "@/lib/services/resume-generation.service";
import { generateResumeSchema } from "@/lib/validators/profile.validator";

export class ResumeGenerationController {
  private resumeGenerationService = new ResumeGenerationService();

  async generateResumePDF(request: NextRequest) {
    try {
      const session = await auth.api.getSession({ headers: request.headers });
      if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      const body = await request.json();
      const validatedData = generateResumeSchema.parse(body);

      // Validate that the user has the required data for the resume
      const validation = await this.resumeGenerationService.validateResumeGeneration(
        session.user.id,
        validatedData
      );

      if (!validation.valid) {
        return NextResponse.json(
          { error: "Resume validation failed", details: validation.errors },
          { status: 400 }
        );
      }

      // Generate PDF
      const pdfBuffer = await this.resumeGenerationService.generateResumePDF(
        session.user.id,
        validatedData
      );

      // Return PDF as downloadable file
      return new NextResponse(new Uint8Array(pdfBuffer), {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${validatedData.title.replace(/[^a-zA-Z0-9]/g, '_')}.pdf"`,
          'Content-Length': pdfBuffer.length.toString(),
        },
      });
    } catch (error) {
      console.error("Error generating resume PDF:", error);
      return NextResponse.json(
        { error: "Failed to generate resume PDF" },
        { status: 500 }
      );
    }
  }

  async generateResumeHTML(request: NextRequest) {
    try {
      const session = await auth.api.getSession({ headers: request.headers });
      if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      const body = await request.json();
      const validatedData = generateResumeSchema.parse(body);

      // Generate HTML
      const html = await this.resumeGenerationService.generateResumeHTML(
        session.user.id,
        validatedData
      );

      return new NextResponse(html, {
        status: 200,
        headers: {
          'Content-Type': 'text/html',
        },
      });
    } catch (error) {
      console.error("Error generating resume HTML:", error);
      return NextResponse.json(
        { error: "Failed to generate resume HTML" },
        { status: 500 }
      );
    }
  }

  async generateResumePreview(request: NextRequest) {
    try {
      const session = await auth.api.getSession({ headers: request.headers });
      if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      const body = await request.json();
      const validatedData = generateResumeSchema.parse(body);

      // Generate preview HTML
      const html = await this.resumeGenerationService.generatePreviewHTML(
        session.user.id,
        validatedData
      );

      return new NextResponse(html, {
        status: 200,
        headers: {
          'Content-Type': 'text/html',
        },
      });
    } catch (error) {
      console.error("Error generating resume preview:", error);
      return NextResponse.json(
        { error: "Failed to generate resume preview" },
        { status: 500 }
      );
    }
  }

  async validateResumeGeneration(request: NextRequest) {
    try {
      const session = await auth.api.getSession({ headers: request.headers });
      if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      const body = await request.json();
      const validatedData = generateResumeSchema.parse(body);

      // Validate resume generation
      const validation = await this.resumeGenerationService.validateResumeGeneration(
        session.user.id,
        validatedData
      );

      return NextResponse.json(validation);
    } catch (error) {
      console.error("Error validating resume generation:", error);
      return NextResponse.json(
        { error: "Failed to validate resume generation" },
        { status: 500 }
      );
    }
  }

  async getResumeData(request: NextRequest) {
    try {
      const session = await auth.api.getSession({ headers: request.headers });
      if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      // Get all resume data for the user
      const resumeData = await this.resumeGenerationService.generateResumeData(
        session.user.id
      );

      return NextResponse.json(resumeData);
    } catch (error) {
      console.error("Error fetching resume data:", error);
      return NextResponse.json(
        { error: "Failed to fetch resume data" },
        { status: 500 }
      );
    }
  }
}