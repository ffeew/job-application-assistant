import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { CoverLettersService } from "@/lib/services";
import { 
  createCoverLetterSchema, 
  updateCoverLetterSchema, 
  coverLettersQuerySchema,
  generateCoverLetterSchema
} from "@/lib/validators";

export class CoverLettersController {
  private coverLettersService: CoverLettersService;

  constructor() {
    this.coverLettersService = new CoverLettersService();
  }

  async getCoverLetters(request: NextRequest) {
    try {
      const session = await auth.api.getSession({ headers: await headers() });
      if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      const url = new URL(request.url);
      const queryParams = Object.fromEntries(url.searchParams.entries());
      
      // Validate query parameters
      const validatedQuery = coverLettersQuerySchema.safeParse(queryParams);
      if (!validatedQuery.success) {
        return NextResponse.json(
          { error: "Invalid query parameters", details: validatedQuery.error.issues },
          { status: 400 }
        );
      }

      const coverLetters = await this.coverLettersService.getCoverLetters(
        session.user.id,
        validatedQuery.data
      );

      return NextResponse.json(coverLetters);
    } catch (error) {
      console.error("Error fetching cover letters:", error);
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 }
      );
    }
  }

  async getCoverLetterById(request: NextRequest, { params }: { params: { id: string } }) {
    try {
      const session = await auth.api.getSession({ headers: await headers() });
      if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      const coverLetter = await this.coverLettersService.getCoverLetterById(
        session.user.id,
        params.id
      );

      if (!coverLetter) {
        return NextResponse.json({ error: "Cover letter not found" }, { status: 404 });
      }

      return NextResponse.json(coverLetter);
    } catch (error) {
      console.error("Error fetching cover letter:", error);
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 }
      );
    }
  }

  async createCoverLetter(request: NextRequest) {
    try {
      const session = await auth.api.getSession({ headers: await headers() });
      if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      const body = await request.json();
      
      // Validate request body
      const validatedData = createCoverLetterSchema.safeParse(body);
      if (!validatedData.success) {
        return NextResponse.json(
          { error: "Invalid request data", details: validatedData.error.issues },
          { status: 400 }
        );
      }

      const coverLetter = await this.coverLettersService.createCoverLetter(
        session.user.id,
        validatedData.data
      );

      return NextResponse.json(coverLetter, { status: 201 });
    } catch (error) {
      console.error("Error creating cover letter:", error);
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 }
      );
    }
  }

  async updateCoverLetter(request: NextRequest, { params }: { params: { id: string } }) {
    try {
      const session = await auth.api.getSession({ headers: await headers() });
      if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      const body = await request.json();
      
      // Validate request body
      const validatedData = updateCoverLetterSchema.safeParse(body);
      if (!validatedData.success) {
        return NextResponse.json(
          { error: "Invalid request data", details: validatedData.error.issues },
          { status: 400 }
        );
      }

      const coverLetter = await this.coverLettersService.updateCoverLetter(
        session.user.id,
        params.id,
        validatedData.data
      );

      if (!coverLetter) {
        return NextResponse.json({ error: "Cover letter not found" }, { status: 404 });
      }

      return NextResponse.json(coverLetter);
    } catch (error) {
      console.error("Error updating cover letter:", error);
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 }
      );
    }
  }

  async deleteCoverLetter(request: NextRequest, { params }: { params: { id: string } }) {
    try {
      const session = await auth.api.getSession({ headers: await headers() });
      if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      const success = await this.coverLettersService.deleteCoverLetter(
        session.user.id,
        params.id
      );

      if (!success) {
        return NextResponse.json({ error: "Cover letter not found" }, { status: 404 });
      }

      return NextResponse.json({ success: true });
    } catch (error) {
      console.error("Error deleting cover letter:", error);
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 }
      );
    }
  }

  async generateCoverLetter(request: NextRequest) {
    try {
      const session = await auth.api.getSession({ headers: await headers() });
      if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      const body = await request.json();
      
      // Validate request body
      const validatedData = generateCoverLetterSchema.safeParse(body);
      if (!validatedData.success) {
        return NextResponse.json(
          { error: "Invalid request data", details: validatedData.error.issues },
          { status: 400 }
        );
      }

      const result = await this.coverLettersService.generateCoverLetter(validatedData.data);
      return NextResponse.json(result);
    } catch (error) {
      console.error("Error generating cover letter:", error);
      if (error instanceof Error) {
        return NextResponse.json(
          { error: error.message },
          { status: error.message.includes("not configured") ? 503 : 500 }
        );
      }
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 }
      );
    }
  }
}