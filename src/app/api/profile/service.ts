import { db } from "@/lib/db/db";
import {
  achievements,
  certifications,
  education,
  projects,
  references,
  skills,
  userProfiles,
  workExperiences,
} from "@/lib/db/schema";
import { and, asc, desc, eq } from "drizzle-orm";
import type {
  AchievementResponse,
  BulkUpdateOrderRequest,
  CreateAchievementRequest,
  CreateCertificationRequest,
  CreateEducationRequest,
  CreateProjectRequest,
  CreateReferenceRequest,
  CreateSkillRequest,
  CreateUserProfileRequest,
  CreateWorkExperienceRequest,
  EducationResponse,
  CertificationResponse,
  ProfileQuery,
  ProjectResponse,
  ReferenceResponse,
  SkillResponse,
  UpdateAchievementRequest,
  UpdateCertificationRequest,
  UpdateEducationRequest,
  UpdateProjectRequest,
  UpdateReferenceRequest,
  UpdateSkillRequest,
  UpdateUserProfileRequest,
  UpdateWorkExperienceRequest,
  UserProfileResponse,
  WorkExperienceResponse,
} from "./validators";

export class ProfileService {
  // User Profile Methods
  async getUserProfile(userId: string): Promise<UserProfileResponse | null> {
    const profilesList = await db
      .select()
      .from(userProfiles)
      .where(eq(userProfiles.userId, userId))
      .limit(1);

    return profilesList[0] || null;
  }

  async createUserProfile(userId: string, data: CreateUserProfileRequest): Promise<UserProfileResponse> {
    const now = new Date();

    const [profile] = await db
      .insert(userProfiles)
      .values({
        userId,
        ...data,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    return profile;
  }

  async updateUserProfile(
    userId: string, 
    data: UpdateUserProfileRequest
  ): Promise<UserProfileResponse | null> {
    const now = new Date();

    const [profile] = await db
      .update(userProfiles)
      .set({
        ...data,
        updatedAt: now,
      })
      .where(eq(userProfiles.userId, userId))
      .returning();

    return profile || null;
  }

  // Work Experience Methods
  async getWorkExperiences(userId: string, query?: ProfileQuery): Promise<WorkExperienceResponse[]> {
    const orderBy = query?.orderBy === "createdAt" ? workExperiences.createdAt :
                   query?.orderBy === "updatedAt" ? workExperiences.updatedAt :
                   workExperiences.displayOrder;
    const order = query?.order === "desc" ? desc : asc;

    const results = await db
      .select()
      .from(workExperiences)
      .where(eq(workExperiences.userId, userId))
      .orderBy(order(orderBy))
      .limit(query?.limit || 100)
      .offset(query?.offset || 0);

    return results;
  }

  async getWorkExperience(userId: string, id: number): Promise<WorkExperienceResponse | null> {
    const experiencesList = await db
      .select()
      .from(workExperiences)
      .where(and(
        eq(workExperiences.id, id),
        eq(workExperiences.userId, userId)
      ))
      .limit(1);

    return experiencesList[0] || null;
  }

  async createWorkExperience(userId: string, data: CreateWorkExperienceRequest): Promise<WorkExperienceResponse> {
    const now = new Date();

    const [experience] = await db
      .insert(workExperiences)
      .values({
        userId,
        ...data,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    return experience;
  }

  async updateWorkExperience(
    userId: string, 
    id: number, 
    data: UpdateWorkExperienceRequest
  ): Promise<WorkExperienceResponse | null> {
    const now = new Date();

    const [experience] = await db
      .update(workExperiences)
      .set({
        ...data,
        updatedAt: now,
      })
      .where(and(
        eq(workExperiences.id, id),
        eq(workExperiences.userId, userId)
      ))
      .returning();

    return experience || null;
  }

  async deleteWorkExperience(userId: string, id: number): Promise<boolean> {
    const result = await db
      .delete(workExperiences)
      .where(and(
        eq(workExperiences.id, id),
        eq(workExperiences.userId, userId)
      ));

    return result.rowsAffected > 0;
  }

  // Education Methods
  async getEducation(userId: string, query?: ProfileQuery): Promise<EducationResponse[]> {
    const orderBy = query?.orderBy === "createdAt" ? education.createdAt :
                   query?.orderBy === "updatedAt" ? education.updatedAt :
                   education.displayOrder;
    const order = query?.order === "desc" ? desc : asc;

    const results = await db
      .select()
      .from(education)
      .where(eq(education.userId, userId))
      .orderBy(order(orderBy))
      .limit(query?.limit || 100)
      .offset(query?.offset || 0);

    return results;
  }

  async getEducationById(userId: string, id: number): Promise<EducationResponse | null> {
    const educationList = await db
      .select()
      .from(education)
      .where(and(
        eq(education.id, id),
        eq(education.userId, userId)
      ))
      .limit(1);

    return educationList[0] || null;
  }

  async createEducation(userId: string, data: CreateEducationRequest): Promise<EducationResponse> {
    const now = new Date();

    const [educationRecord] = await db
      .insert(education)
      .values({
        userId,
        ...data,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    return educationRecord;
  }

  async updateEducation(
    userId: string, 
    id: number, 
    data: UpdateEducationRequest
  ): Promise<EducationResponse | null> {
    const now = new Date();

    const [educationRecord] = await db
      .update(education)
      .set({
        ...data,
        updatedAt: now,
      })
      .where(and(
        eq(education.id, id),
        eq(education.userId, userId)
      ))
      .returning();

    return educationRecord || null;
  }

  async deleteEducation(userId: string, id: number): Promise<boolean> {
    const result = await db
      .delete(education)
      .where(and(
        eq(education.id, id),
        eq(education.userId, userId)
      ));

    return result.rowsAffected > 0;
  }

  // Skills Methods
  async getSkills(userId: string, query?: ProfileQuery): Promise<SkillResponse[]> {
    const whereConditions = [eq(skills.userId, userId)];
    
    if (query?.category) {
      whereConditions.push(eq(skills.category, query.category as "technical" | "soft" | "language" | "tool" | "framework" | "other"));
    }

    const orderBy = query?.orderBy === "createdAt" ? skills.createdAt :
                   query?.orderBy === "updatedAt" ? skills.updatedAt :
                   skills.displayOrder;
    const order = query?.order === "desc" ? desc : asc;

    const results = await db
      .select()
      .from(skills)
      .where(and(...whereConditions))
      .orderBy(order(orderBy))
      .limit(query?.limit || 100)
      .offset(query?.offset || 0);

    return results;
  }

  async getSkill(userId: string, id: number): Promise<SkillResponse | null> {
    const skillsList = await db
      .select()
      .from(skills)
      .where(and(
        eq(skills.id, id),
        eq(skills.userId, userId)
      ))
      .limit(1);

    return skillsList[0] || null;
  }

  async createSkill(userId: string, data: CreateSkillRequest): Promise<SkillResponse> {
    const now = new Date();

    const [skill] = await db
      .insert(skills)
      .values({
        userId,
        ...data,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    return skill;
  }

  async updateSkill(
    userId: string, 
    id: number, 
    data: UpdateSkillRequest
  ): Promise<SkillResponse | null> {
    const now = new Date();

    const [skill] = await db
      .update(skills)
      .set({
        ...data,
        updatedAt: now,
      })
      .where(and(
        eq(skills.id, id),
        eq(skills.userId, userId)
      ))
      .returning();

    return skill || null;
  }

  async deleteSkill(userId: string, id: number): Promise<boolean> {
    const result = await db
      .delete(skills)
      .where(and(
        eq(skills.id, id),
        eq(skills.userId, userId)
      ));

    return result.rowsAffected > 0;
  }

  // Projects Methods
  async getProjects(userId: string, query?: ProfileQuery): Promise<ProjectResponse[]> {
    const orderBy = query?.orderBy === "createdAt" ? projects.createdAt :
                   query?.orderBy === "updatedAt" ? projects.updatedAt :
                   projects.displayOrder;
    const order = query?.order === "desc" ? desc : asc;

    return await db
      .select()
      .from(projects)
      .where(eq(projects.userId, userId))
      .orderBy(order(orderBy))
      .limit(query?.limit || 100)
      .offset(query?.offset || 0);
  }

  async getProject(userId: string, id: number): Promise<ProjectResponse | null> {
    const projectsList = await db
      .select()
      .from(projects)
      .where(and(
        eq(projects.id, id),
        eq(projects.userId, userId)
      ))
      .limit(1);

    return projectsList[0] || null;
  }

  async createProject(userId: string, data: CreateProjectRequest): Promise<ProjectResponse> {
    const now = new Date();

    const [project] = await db
      .insert(projects)
      .values({
        userId,
        ...data,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    return project;
  }

  async updateProject(
    userId: string, 
    id: number, 
    data: UpdateProjectRequest
  ): Promise<ProjectResponse | null> {
    const now = new Date();

    const [project] = await db
      .update(projects)
      .set({
        ...data,
        updatedAt: now,
      })
      .where(and(
        eq(projects.id, id),
        eq(projects.userId, userId)
      ))
      .returning();

    return project || null;
  }

  async deleteProject(userId: string, id: number): Promise<boolean> {
    const result = await db
      .delete(projects)
      .where(and(
        eq(projects.id, id),
        eq(projects.userId, userId)
      ));

    return result.rowsAffected > 0;
  }

  // Certifications Methods
  async getCertifications(userId: string, query?: ProfileQuery): Promise<CertificationResponse[]> {
    const orderBy = query?.orderBy === "createdAt" ? certifications.createdAt :
                   query?.orderBy === "updatedAt" ? certifications.updatedAt :
                   certifications.displayOrder;
    const order = query?.order === "desc" ? desc : asc;

    return await db
      .select()
      .from(certifications)
      .where(eq(certifications.userId, userId))
      .orderBy(order(orderBy))
      .limit(query?.limit || 100)
      .offset(query?.offset || 0);
  }

  async getCertification(userId: string, id: number): Promise<CertificationResponse | null> {
    const certificationsList = await db
      .select()
      .from(certifications)
      .where(and(
        eq(certifications.id, id),
        eq(certifications.userId, userId)
      ))
      .limit(1);

    return certificationsList[0] || null;
  }

  async createCertification(userId: string, data: CreateCertificationRequest): Promise<CertificationResponse> {
    const now = new Date();

    const [certification] = await db
      .insert(certifications)
      .values({
        userId,
        ...data,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    return certification;
  }

  async updateCertification(
    userId: string, 
    id: number, 
    data: UpdateCertificationRequest
  ): Promise<CertificationResponse | null> {
    const now = new Date();

    const [certification] = await db
      .update(certifications)
      .set({
        ...data,
        updatedAt: now,
      })
      .where(and(
        eq(certifications.id, id),
        eq(certifications.userId, userId)
      ))
      .returning();

    return certification || null;
  }

  async deleteCertification(userId: string, id: number): Promise<boolean> {
    const result = await db
      .delete(certifications)
      .where(and(
        eq(certifications.id, id),
        eq(certifications.userId, userId)
      ));

    return result.rowsAffected > 0;
  }

  // Achievements Methods
  async getAchievements(userId: string, query?: ProfileQuery): Promise<AchievementResponse[]> {
    const orderBy = query?.orderBy === "createdAt" ? achievements.createdAt :
                   query?.orderBy === "updatedAt" ? achievements.updatedAt :
                   achievements.displayOrder;
    const order = query?.order === "desc" ? desc : asc;

    return await db
      .select()
      .from(achievements)
      .where(eq(achievements.userId, userId))
      .orderBy(order(orderBy))
      .limit(query?.limit || 100)
      .offset(query?.offset || 0);
  }

  async getAchievement(userId: string, id: number): Promise<AchievementResponse | null> {
    const achievementsList = await db
      .select()
      .from(achievements)
      .where(and(
        eq(achievements.id, id),
        eq(achievements.userId, userId)
      ))
      .limit(1);

    return achievementsList[0] || null;
  }

  async createAchievement(userId: string, data: CreateAchievementRequest): Promise<AchievementResponse> {
    const now = new Date();

    const [achievement] = await db
      .insert(achievements)
      .values({
        userId,
        ...data,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    return achievement;
  }

  async updateAchievement(
    userId: string, 
    id: number, 
    data: UpdateAchievementRequest
  ): Promise<AchievementResponse | null> {
    const now = new Date();

    const [achievement] = await db
      .update(achievements)
      .set({
        ...data,
        updatedAt: now,
      })
      .where(and(
        eq(achievements.id, id),
        eq(achievements.userId, userId)
      ))
      .returning();

    return achievement || null;
  }

  async deleteAchievement(userId: string, id: number): Promise<boolean> {
    const result = await db
      .delete(achievements)
      .where(and(
        eq(achievements.id, id),
        eq(achievements.userId, userId)
      ));

    return result.rowsAffected > 0;
  }

  // References Methods
  async getReferences(userId: string, query?: ProfileQuery): Promise<ReferenceResponse[]> {
    const orderBy = query?.orderBy === "createdAt" ? references.createdAt :
                   query?.orderBy === "updatedAt" ? references.updatedAt :
                   references.displayOrder;
    const order = query?.order === "desc" ? desc : asc;

    return await db
      .select()
      .from(references)
      .where(eq(references.userId, userId))
      .orderBy(order(orderBy))
      .limit(query?.limit || 100)
      .offset(query?.offset || 0);
  }

  async getReference(userId: string, id: number): Promise<ReferenceResponse | null> {
    const referencesList = await db
      .select()
      .from(references)
      .where(and(
        eq(references.id, id),
        eq(references.userId, userId)
      ))
      .limit(1);

    return referencesList[0] || null;
  }

  async createReference(userId: string, data: CreateReferenceRequest): Promise<ReferenceResponse> {
    const now = new Date();

    const [reference] = await db
      .insert(references)
      .values({
        userId,
        ...data,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    return reference;
  }

  async updateReference(
    userId: string, 
    id: number, 
    data: UpdateReferenceRequest
  ): Promise<ReferenceResponse | null> {
    const now = new Date();

    const [reference] = await db
      .update(references)
      .set({
        ...data,
        updatedAt: now,
      })
      .where(and(
        eq(references.id, id),
        eq(references.userId, userId)
      ))
      .returning();

    return reference || null;
  }

  async deleteReference(userId: string, id: number): Promise<boolean> {
    const result = await db
      .delete(references)
      .where(and(
        eq(references.id, id),
        eq(references.userId, userId)
      ));

    return result.rowsAffected > 0;
  }

  // Bulk operations for reordering
  async bulkUpdateWorkExperienceOrder(userId: string, data: BulkUpdateOrderRequest): Promise<void> {
    await Promise.all(
      data.items.map(item =>
        db.update(workExperiences)
          .set({ displayOrder: item.displayOrder })
          .where(and(
            eq(workExperiences.id, item.id),
            eq(workExperiences.userId, userId)
          ))
      )
    );
  }

  async bulkUpdateEducationOrder(userId: string, data: BulkUpdateOrderRequest): Promise<void> {
    await Promise.all(
      data.items.map(item =>
        db.update(education)
          .set({ displayOrder: item.displayOrder })
          .where(and(
            eq(education.id, item.id),
            eq(education.userId, userId)
          ))
      )
    );
  }

  async bulkUpdateSkillsOrder(userId: string, data: BulkUpdateOrderRequest): Promise<void> {
    await Promise.all(
      data.items.map(item =>
        db.update(skills)
          .set({ displayOrder: item.displayOrder })
          .where(and(
            eq(skills.id, item.id),
            eq(skills.userId, userId)
          ))
      )
    );
  }

  async bulkUpdateProjectsOrder(userId: string, data: BulkUpdateOrderRequest): Promise<void> {
    await Promise.all(
      data.items.map(item =>
        db.update(projects)
          .set({ displayOrder: item.displayOrder })
          .where(and(
            eq(projects.id, item.id),
            eq(projects.userId, userId)
          ))
      )
    );
  }

  async bulkUpdateCertificationsOrder(userId: string, data: BulkUpdateOrderRequest): Promise<void> {
    await Promise.all(
      data.items.map(item =>
        db.update(certifications)
          .set({ displayOrder: item.displayOrder })
          .where(and(
            eq(certifications.id, item.id),
            eq(certifications.userId, userId)
          ))
      )
    );
  }

  async bulkUpdateAchievementsOrder(userId: string, data: BulkUpdateOrderRequest): Promise<void> {
    await Promise.all(
      data.items.map(item =>
        db.update(achievements)
          .set({ displayOrder: item.displayOrder })
          .where(and(
            eq(achievements.id, item.id),
            eq(achievements.userId, userId)
          ))
      )
    );
  }

  async bulkUpdateReferencesOrder(userId: string, data: BulkUpdateOrderRequest): Promise<void> {
    await Promise.all(
      data.items.map(item =>
        db.update(references)
          .set({ displayOrder: item.displayOrder })
          .where(and(
            eq(references.id, item.id),
            eq(references.userId, userId)
          ))
      )
    );
  }
}
