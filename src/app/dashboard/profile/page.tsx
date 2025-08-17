"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, User, Briefcase, GraduationCap, Code, FolderOpen, Award, Trophy, Users } from "lucide-react";
import { 
  useUserProfile,
  useWorkExperiences,
  useEducation,
  useSkills,
  useProjects,
  useCertifications,
  useAchievements,
  useReferences
} from "@/hooks/use-profile";
import { UserProfileForm } from "@/components/profile/user-profile-form";
import { WorkExperienceList } from "@/components/profile/work-experience-list-new";
import { EducationList } from "@/components/profile/education-list";
import { SkillsList } from "@/components/profile/skills-list";
import { ProjectsList } from "@/components/profile/projects-list";
import { CertificationsList } from "@/components/profile/certifications-list";
import { AchievementsList } from "@/components/profile/achievements-list";
import { ReferencesList } from "@/components/profile/references-list";

export default function ProfilePage() {
  const [activeTab, setActiveTab] = useState("personal");
  
  const { data: userProfile, isLoading: profileLoading } = useUserProfile();
  const { data: workExperiences = [], isLoading: workLoading } = useWorkExperiences({ orderBy: "displayOrder", order: "asc" });
  const { data: education = [], isLoading: educationLoading } = useEducation({ orderBy: "displayOrder", order: "asc" });
  const { data: skills = [], isLoading: skillsLoading } = useSkills({ orderBy: "displayOrder", order: "asc" });
  const { data: projects = [], isLoading: projectsLoading } = useProjects({ orderBy: "displayOrder", order: "asc" });
  const { data: certifications = [], isLoading: certificationsLoading } = useCertifications({ orderBy: "displayOrder", order: "asc" });
  const { data: achievements = [], isLoading: achievementsLoading } = useAchievements({ orderBy: "displayOrder", order: "asc" });
  const { data: references = [], isLoading: referencesLoading } = useReferences({ orderBy: "displayOrder", order: "asc" });

  const tabs = [
    {
      value: "personal",
      label: "Personal Info",
      icon: User,
      count: userProfile ? 1 : 0,
      component: <UserProfileForm profile={userProfile || null} />
    },
    {
      value: "experience",
      label: "Work Experience",
      icon: Briefcase,
      count: workExperiences.length,
      component: <WorkExperienceList experiences={workExperiences} isLoading={workLoading} />
    },
    {
      value: "education",
      label: "Education",
      icon: GraduationCap,
      count: education.length,
      component: <EducationList education={education} isLoading={educationLoading} />
    },
    {
      value: "skills",
      label: "Skills",
      icon: Code,
      count: skills.length,
      component: <SkillsList skills={skills} isLoading={skillsLoading} />
    },
    {
      value: "projects",
      label: "Projects",
      icon: FolderOpen,
      count: projects.length,
      component: <ProjectsList projects={projects} isLoading={projectsLoading} />
    },
    {
      value: "certifications",
      label: "Certifications",
      icon: Award,
      count: certifications.length,
      component: <CertificationsList certifications={certifications} isLoading={certificationsLoading} />
    },
    {
      value: "achievements",
      label: "Achievements",
      icon: Trophy,
      count: achievements.length,
      component: <AchievementsList achievements={achievements} isLoading={achievementsLoading} />
    },
    {
      value: "references",
      label: "References",
      icon: Users,
      count: references.length,
      component: <ReferencesList references={references} isLoading={referencesLoading} />
    }
  ];

  if (profileLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Profile Management</h1>
          <p className="text-muted-foreground">
            Manage your professional profile information
          </p>
        </div>
        <div className="animate-pulse space-y-4">
          <div className="h-12 bg-gray-200 rounded"></div>
          <div className="h-96 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Profile Management</h1>
          <p className="text-muted-foreground">
            Manage your professional profile information for resume generation
          </p>
        </div>
        <Button onClick={() => {
          // Navigate to resume generation with current profile data
          window.location.href = "/dashboard/resumes/generate";
        }}>
          <Plus className="mr-2 h-4 w-4" />
          Generate Resume
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Profile Sections</CardTitle>
          <CardDescription>
            Complete your profile to generate professional resumes
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid grid-cols-4 lg:grid-cols-8 w-full">
              {tabs.map((tab) => (
                <TabsTrigger 
                  key={tab.value} 
                  value={tab.value}
                  className="flex flex-col items-center gap-1 h-16 text-xs"
                >
                  <tab.icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{tab.label}</span>
                  <span className="bg-blue-100 text-blue-800 text-xs rounded-full px-1.5 py-0.5 min-w-[20px]">
                    {tab.count}
                  </span>
                </TabsTrigger>
              ))}
            </TabsList>

            {tabs.map((tab) => (
              <TabsContent key={tab.value} value={tab.value} className="mt-6">
                {tab.component}
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}