import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { ResumesService } from "@/lib/services";
import { 
  createResumeSchema, 
  updateResumeSchema, 
  resumesQuerySchema 
} from "@/lib/validators";

export class ResumesController {
  private resumesService: ResumesService;

  constructor() {
    this.resumesService = new ResumesService();
  }

  async getResumes(request: NextRequest) {
    try {
      const session = await auth.api.getSession({ headers: await headers() });
      if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      const url = new URL(request.url);
      const queryParams = Object.fromEntries(url.searchParams.entries());
      
      // Validate query parameters
      const validatedQuery = resumesQuerySchema.safeParse(queryParams);
      if (!validatedQuery.success) {
        return NextResponse.json(
          { error: "Invalid query parameters", details: validatedQuery.error.issues },
          { status: 400 }
        );
      }

      const resumes = await this.resumesService.getResumes(
        session.user.id,
        validatedQuery.data
      );

      return NextResponse.json(resumes);
    } catch (error) {
      console.error("Error fetching resumes:", error);
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 }
      );
    }
  }

  async getResumeById(request: NextRequest, { params }: { params: { id: string } }) {
    try {
      const session = await auth.api.getSession({ headers: await headers() });
      if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      const resume = await this.resumesService.getResumeById(
        session.user.id,
        params.id
      );

      if (!resume) {
        return NextResponse.json({ error: "Resume not found" }, { status: 404 });
      }

      return NextResponse.json(resume);
    } catch (error) {
      console.error("Error fetching resume:", error);
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 }
      );
    }
  }

  async createResume(request: NextRequest) {
    try {
      const session = await auth.api.getSession({ headers: await headers() });
      if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      const body = await request.json();
      
      // Validate request body
      const validatedData = createResumeSchema.safeParse(body);
      if (!validatedData.success) {
        return NextResponse.json(
          { error: "Invalid request data", details: validatedData.error.issues },
          { status: 400 }
        );
      }

      const resume = await this.resumesService.createResume(
        session.user.id,
        validatedData.data
      );

      return NextResponse.json(resume, { status: 201 });
    } catch (error) {
      console.error("Error creating resume:", error);
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 }
      );
    }
  }

  async updateResume(request: NextRequest, { params }: { params: { id: string } }) {
    try {
      const session = await auth.api.getSession({ headers: await headers() });
      if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      const body = await request.json();
      
      // Validate request body
      const validatedData = updateResumeSchema.safeParse(body);
      if (!validatedData.success) {
        return NextResponse.json(
          { error: "Invalid request data", details: validatedData.error.issues },
          { status: 400 }
        );
      }

      const resume = await this.resumesService.updateResume(
        session.user.id,
        params.id,
        validatedData.data
      );

      if (!resume) {
        return NextResponse.json({ error: "Resume not found" }, { status: 404 });
      }

      return NextResponse.json(resume);
    } catch (error) {
      console.error("Error updating resume:", error);
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 }
      );
    }
  }

  async deleteResume(request: NextRequest, { params }: { params: { id: string } }) {
    try {
      const session = await auth.api.getSession({ headers: await headers() });
      if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      const success = await this.resumesService.deleteResume(
        session.user.id,
        params.id
      );

      if (!success) {
        return NextResponse.json({ error: "Resume not found" }, { status: 404 });
      }

      return NextResponse.json({ success: true });
    } catch (error) {
      console.error("Error deleting resume:", error);
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 }
      );
    }
  }
}