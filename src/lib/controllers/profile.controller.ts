import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { ProfileService } from "@/lib/services/profile.service";
import {
  createUserProfileSchema,
  updateUserProfileSchema,
  createWorkExperienceSchema,
  updateWorkExperienceSchema,
  createEducationSchema,
  updateEducationSchema,
  createSkillSchema,
  updateSkillSchema,
  createProjectSchema,
  createCertificationSchema,
  profileQuerySchema,
  bulkUpdateOrderSchema,
} from "@/lib/validators/profile.validator";

export class ProfileController {
  private profileService = new ProfileService();

  // User Profile endpoints
  async getUserProfile(request: NextRequest) {
    try {
      const session = await auth.api.getSession({ headers: request.headers });
      if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      const profile = await this.profileService.getUserProfile(session.user.id);
      return NextResponse.json(profile);
    } catch (error) {
      console.error("Error fetching user profile:", error);
      return NextResponse.json(
        { error: "Failed to fetch user profile" },
        { status: 500 }
      );
    }
  }

  async createUserProfile(request: NextRequest) {
    try {
      const session = await auth.api.getSession({ headers: request.headers });
      if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      const body = await request.json();
      const validatedData = createUserProfileSchema.parse(body);

      const profile = await this.profileService.createUserProfile(
        session.user.id,
        validatedData
      );

      return NextResponse.json(profile, { status: 201 });
    } catch (error) {
      console.error("Error creating user profile:", error);
      return NextResponse.json(
        { error: "Failed to create user profile" },
        { status: 500 }
      );
    }
  }

  async updateUserProfile(request: NextRequest) {
    try {
      const session = await auth.api.getSession({ headers: request.headers });
      if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      const body = await request.json();
      const validatedData = updateUserProfileSchema.parse(body);

      const profile = await this.profileService.updateUserProfile(
        session.user.id,
        validatedData
      );

      if (!profile) {
        return NextResponse.json({ error: "Profile not found" }, { status: 404 });
      }

      return NextResponse.json(profile);
    } catch (error) {
      console.error("Error updating user profile:", error);
      return NextResponse.json(
        { error: "Failed to update user profile" },
        { status: 500 }
      );
    }
  }

  // Work Experience endpoints
  async getWorkExperiences(request: NextRequest) {
    try {
      const session = await auth.api.getSession({ headers: request.headers });
      if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      const { searchParams } = new URL(request.url);
      const query = profileQuerySchema.parse(Object.fromEntries(searchParams));

      const experiences = await this.profileService.getWorkExperiences(
        session.user.id,
        query
      );

      return NextResponse.json(experiences);
    } catch (error) {
      console.error("Error fetching work experiences:", error);
      return NextResponse.json(
        { error: "Failed to fetch work experiences" },
        { status: 500 }
      );
    }
  }

  async getWorkExperience(request: NextRequest, { params }: { params: { id: string } }) {
    try {
      const session = await auth.api.getSession({ headers: request.headers });
      if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      const id = parseInt(params.id);
      if (isNaN(id)) {
        return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
      }

      const experience = await this.profileService.getWorkExperience(session.user.id, id);
      if (!experience) {
        return NextResponse.json({ error: "Work experience not found" }, { status: 404 });
      }

      return NextResponse.json(experience);
    } catch (error) {
      console.error("Error fetching work experience:", error);
      return NextResponse.json(
        { error: "Failed to fetch work experience" },
        { status: 500 }
      );
    }
  }

  async createWorkExperience(request: NextRequest) {
    try {
      const session = await auth.api.getSession({ headers: request.headers });
      if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      const body = await request.json();
      const validatedData = createWorkExperienceSchema.parse(body);

      const experience = await this.profileService.createWorkExperience(
        session.user.id,
        validatedData
      );

      return NextResponse.json(experience, { status: 201 });
    } catch (error) {
      console.error("Error creating work experience:", error);
      return NextResponse.json(
        { error: "Failed to create work experience" },
        { status: 500 }
      );
    }
  }

  async updateWorkExperience(request: NextRequest, { params }: { params: { id: string } }) {
    try {
      const session = await auth.api.getSession({ headers: request.headers });
      if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      const id = parseInt(params.id);
      if (isNaN(id)) {
        return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
      }

      const body = await request.json();
      const validatedData = updateWorkExperienceSchema.parse(body);

      const experience = await this.profileService.updateWorkExperience(
        session.user.id,
        id,
        validatedData
      );

      if (!experience) {
        return NextResponse.json({ error: "Work experience not found" }, { status: 404 });
      }

      return NextResponse.json(experience);
    } catch (error) {
      console.error("Error updating work experience:", error);
      return NextResponse.json(
        { error: "Failed to update work experience" },
        { status: 500 }
      );
    }
  }

  async deleteWorkExperience(request: NextRequest, { params }: { params: { id: string } }) {
    try {
      const session = await auth.api.getSession({ headers: request.headers });
      if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      const id = parseInt(params.id);
      if (isNaN(id)) {
        return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
      }

      const success = await this.profileService.deleteWorkExperience(session.user.id, id);
      if (!success) {
        return NextResponse.json({ error: "Work experience not found" }, { status: 404 });
      }

      return NextResponse.json({ success: true });
    } catch (error) {
      console.error("Error deleting work experience:", error);
      return NextResponse.json(
        { error: "Failed to delete work experience" },
        { status: 500 }
      );
    }
  }

  // Education endpoints
  async getEducation(request: NextRequest) {
    try {
      const session = await auth.api.getSession({ headers: request.headers });
      if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      const { searchParams } = new URL(request.url);
      const query = profileQuerySchema.parse(Object.fromEntries(searchParams));

      const education = await this.profileService.getEducation(session.user.id, query);
      return NextResponse.json(education);
    } catch (error) {
      console.error("Error fetching education:", error);
      return NextResponse.json(
        { error: "Failed to fetch education" },
        { status: 500 }
      );
    }
  }

  async getEducationById(request: NextRequest, { params }: { params: { id: string } }) {
    try {
      const session = await auth.api.getSession({ headers: request.headers });
      if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      const id = parseInt(params.id);
      if (isNaN(id)) {
        return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
      }

      const education = await this.profileService.getEducationById(session.user.id, id);
      if (!education) {
        return NextResponse.json({ error: "Education not found" }, { status: 404 });
      }

      return NextResponse.json(education);
    } catch (error) {
      console.error("Error fetching education:", error);
      return NextResponse.json(
        { error: "Failed to fetch education" },
        { status: 500 }
      );
    }
  }

  async createEducation(request: NextRequest) {
    try {
      const session = await auth.api.getSession({ headers: request.headers });
      if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      const body = await request.json();
      const validatedData = createEducationSchema.parse(body);

      const education = await this.profileService.createEducation(
        session.user.id,
        validatedData
      );

      return NextResponse.json(education, { status: 201 });
    } catch (error) {
      console.error("Error creating education:", error);
      return NextResponse.json(
        { error: "Failed to create education" },
        { status: 500 }
      );
    }
  }

  async updateEducation(request: NextRequest, { params }: { params: { id: string } }) {
    try {
      const session = await auth.api.getSession({ headers: request.headers });
      if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      const id = parseInt(params.id);
      if (isNaN(id)) {
        return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
      }

      const body = await request.json();
      const validatedData = updateEducationSchema.parse(body);

      const education = await this.profileService.updateEducation(
        session.user.id,
        id,
        validatedData
      );

      if (!education) {
        return NextResponse.json({ error: "Education not found" }, { status: 404 });
      }

      return NextResponse.json(education);
    } catch (error) {
      console.error("Error updating education:", error);
      return NextResponse.json(
        { error: "Failed to update education" },
        { status: 500 }
      );
    }
  }

  async deleteEducation(request: NextRequest, { params }: { params: { id: string } }) {
    try {
      const session = await auth.api.getSession({ headers: request.headers });
      if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      const id = parseInt(params.id);
      if (isNaN(id)) {
        return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
      }

      const success = await this.profileService.deleteEducation(session.user.id, id);
      if (!success) {
        return NextResponse.json({ error: "Education not found" }, { status: 404 });
      }

      return NextResponse.json({ success: true });
    } catch (error) {
      console.error("Error deleting education:", error);
      return NextResponse.json(
        { error: "Failed to delete education" },
        { status: 500 }
      );
    }
  }

  // Skills endpoints
  async getSkills(request: NextRequest) {
    try {
      const session = await auth.api.getSession({ headers: request.headers });
      if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      const { searchParams } = new URL(request.url);
      const query = profileQuerySchema.parse(Object.fromEntries(searchParams));

      const skills = await this.profileService.getSkills(session.user.id, query);
      return NextResponse.json(skills);
    } catch (error) {
      console.error("Error fetching skills:", error);
      return NextResponse.json(
        { error: "Failed to fetch skills" },
        { status: 500 }
      );
    }
  }

  async createSkill(request: NextRequest) {
    try {
      const session = await auth.api.getSession({ headers: request.headers });
      if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      const body = await request.json();
      const validatedData = createSkillSchema.parse(body);

      const skill = await this.profileService.createSkill(session.user.id, validatedData);
      return NextResponse.json(skill, { status: 201 });
    } catch (error) {
      console.error("Error creating skill:", error);
      return NextResponse.json(
        { error: "Failed to create skill" },
        { status: 500 }
      );
    }
  }

  async updateSkill(request: NextRequest, { params }: { params: { id: string } }) {
    try {
      const session = await auth.api.getSession({ headers: request.headers });
      if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      const id = parseInt(params.id);
      if (isNaN(id)) {
        return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
      }

      const body = await request.json();
      const validatedData = updateSkillSchema.parse(body);

      const skill = await this.profileService.updateSkill(
        session.user.id,
        id,
        validatedData
      );

      if (!skill) {
        return NextResponse.json({ error: "Skill not found" }, { status: 404 });
      }

      return NextResponse.json(skill);
    } catch (error) {
      console.error("Error updating skill:", error);
      return NextResponse.json(
        { error: "Failed to update skill" },
        { status: 500 }
      );
    }
  }

  async deleteSkill(request: NextRequest, { params }: { params: { id: string } }) {
    try {
      const session = await auth.api.getSession({ headers: request.headers });
      if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      const id = parseInt(params.id);
      if (isNaN(id)) {
        return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
      }

      const success = await this.profileService.deleteSkill(session.user.id, id);
      if (!success) {
        return NextResponse.json({ error: "Skill not found" }, { status: 404 });
      }

      return NextResponse.json({ success: true });
    } catch (error) {
      console.error("Error deleting skill:", error);
      return NextResponse.json(
        { error: "Failed to delete skill" },
        { status: 500 }
      );
    }
  }

  // Bulk update methods for reordering
  async bulkUpdateWorkExperienceOrder(request: NextRequest) {
    try {
      const session = await auth.api.getSession({ headers: request.headers });
      if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      const body = await request.json();
      const validatedData = bulkUpdateOrderSchema.parse(body);

      await this.profileService.bulkUpdateWorkExperienceOrder(
        session.user.id,
        validatedData
      );

      return NextResponse.json({ success: true });
    } catch (error) {
      console.error("Error updating work experience order:", error);
      return NextResponse.json(
        { error: "Failed to update work experience order" },
        { status: 500 }
      );
    }
  }

  async bulkUpdateEducationOrder(request: NextRequest) {
    try {
      const session = await auth.api.getSession({ headers: request.headers });
      if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      const body = await request.json();
      const validatedData = bulkUpdateOrderSchema.parse(body);

      await this.profileService.bulkUpdateEducationOrder(session.user.id, validatedData);
      return NextResponse.json({ success: true });
    } catch (error) {
      console.error("Error updating education order:", error);
      return NextResponse.json(
        { error: "Failed to update education order" },
        { status: 500 }
      );
    }
  }

  async bulkUpdateSkillsOrder(request: NextRequest) {
    try {
      const session = await auth.api.getSession({ headers: request.headers });
      if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      const body = await request.json();
      const validatedData = bulkUpdateOrderSchema.parse(body);

      await this.profileService.bulkUpdateSkillsOrder(session.user.id, validatedData);
      return NextResponse.json({ success: true });
    } catch (error) {
      console.error("Error updating skills order:", error);
      return NextResponse.json(
        { error: "Failed to update skills order" },
        { status: 500 }
      );
    }
  }

  // Additional methods for projects, certifications, achievements, and references would follow the same pattern
  // For brevity, I'll implement a few key ones and the rest can be added similarly

  async getProjects(request: NextRequest) {
    try {
      const session = await auth.api.getSession({ headers: request.headers });
      if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      const { searchParams } = new URL(request.url);
      const query = profileQuerySchema.parse(Object.fromEntries(searchParams));

      const projects = await this.profileService.getProjects(session.user.id, query);
      return NextResponse.json(projects);
    } catch (error) {
      console.error("Error fetching projects:", error);
      return NextResponse.json(
        { error: "Failed to fetch projects" },
        { status: 500 }
      );
    }
  }

  async createProject(request: NextRequest) {
    try {
      const session = await auth.api.getSession({ headers: request.headers });
      if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      const body = await request.json();
      const validatedData = createProjectSchema.parse(body);

      const project = await this.profileService.createProject(
        session.user.id,
        validatedData
      );

      return NextResponse.json(project, { status: 201 });
    } catch (error) {
      console.error("Error creating project:", error);
      return NextResponse.json(
        { error: "Failed to create project" },
        { status: 500 }
      );
    }
  }

  async getCertifications(request: NextRequest) {
    try {
      const session = await auth.api.getSession({ headers: request.headers });
      if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      const { searchParams } = new URL(request.url);
      const query = profileQuerySchema.parse(Object.fromEntries(searchParams));

      const certifications = await this.profileService.getCertifications(
        session.user.id,
        query
      );
      return NextResponse.json(certifications);
    } catch (error) {
      console.error("Error fetching certifications:", error);
      return NextResponse.json(
        { error: "Failed to fetch certifications" },
        { status: 500 }
      );
    }
  }

  async createCertification(request: NextRequest) {
    try {
      const session = await auth.api.getSession({ headers: request.headers });
      if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      const body = await request.json();
      const validatedData = createCertificationSchema.parse(body);

      const certification = await this.profileService.createCertification(
        session.user.id,
        validatedData
      );

      return NextResponse.json(certification, { status: 201 });
    } catch (error) {
      console.error("Error creating certification:", error);
      return NextResponse.json(
        { error: "Failed to create certification" },
        { status: 500 }
      );
    }
  }
}