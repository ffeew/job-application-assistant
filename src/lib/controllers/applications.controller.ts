import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { ApplicationsService } from "@/lib/services";
import { 
  createApplicationSchema, 
  updateApplicationSchema, 
  applicationsQuerySchema 
} from "@/lib/validators";

export class ApplicationsController {
  private applicationsService: ApplicationsService;

  constructor() {
    this.applicationsService = new ApplicationsService();
  }

  async getApplications(request: NextRequest) {
    try {
      const session = await auth.api.getSession({ headers: await headers() });
      if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      const url = new URL(request.url);
      const queryParams = Object.fromEntries(url.searchParams.entries());
      
      // Validate query parameters
      const validatedQuery = applicationsQuerySchema.safeParse(queryParams);
      if (!validatedQuery.success) {
        return NextResponse.json(
          { error: "Invalid query parameters", details: validatedQuery.error.errors },
          { status: 400 }
        );
      }

      const applications = await this.applicationsService.getApplications(
        session.user.id,
        validatedQuery.data
      );

      return NextResponse.json(applications);
    } catch (error) {
      console.error("Error fetching applications:", error);
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 }
      );
    }
  }

  async getApplicationById(request: NextRequest, { params }: { params: { id: string } }) {
    try {
      const session = await auth.api.getSession({ headers: await headers() });
      if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      const application = await this.applicationsService.getApplicationById(
        session.user.id,
        params.id
      );

      if (!application) {
        return NextResponse.json({ error: "Application not found" }, { status: 404 });
      }

      return NextResponse.json(application);
    } catch (error) {
      console.error("Error fetching application:", error);
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 }
      );
    }
  }

  async createApplication(request: NextRequest) {
    try {
      const session = await auth.api.getSession({ headers: await headers() });
      if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      const body = await request.json();
      
      // Validate request body
      const validatedData = createApplicationSchema.safeParse(body);
      if (!validatedData.success) {
        return NextResponse.json(
          { error: "Invalid request data", details: validatedData.error.errors },
          { status: 400 }
        );
      }

      const application = await this.applicationsService.createApplication(
        session.user.id,
        validatedData.data
      );

      return NextResponse.json(application, { status: 201 });
    } catch (error) {
      console.error("Error creating application:", error);
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 }
      );
    }
  }

  async updateApplication(request: NextRequest, { params }: { params: { id: string } }) {
    try {
      const session = await auth.api.getSession({ headers: await headers() });
      if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      const body = await request.json();
      
      // Validate request body
      const validatedData = updateApplicationSchema.safeParse(body);
      if (!validatedData.success) {
        return NextResponse.json(
          { error: "Invalid request data", details: validatedData.error.errors },
          { status: 400 }
        );
      }

      const application = await this.applicationsService.updateApplication(
        session.user.id,
        params.id,
        validatedData.data
      );

      if (!application) {
        return NextResponse.json({ error: "Application not found" }, { status: 404 });
      }

      return NextResponse.json(application);
    } catch (error) {
      console.error("Error updating application:", error);
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 }
      );
    }
  }

  async deleteApplication(request: NextRequest, { params }: { params: { id: string } }) {
    try {
      const session = await auth.api.getSession({ headers: await headers() });
      if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      const success = await this.applicationsService.deleteApplication(
        session.user.id,
        params.id
      );

      if (!success) {
        return NextResponse.json({ error: "Application not found" }, { status: 404 });
      }

      return NextResponse.json({ success: true });
    } catch (error) {
      console.error("Error deleting application:", error);
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 }
      );
    }
  }
}