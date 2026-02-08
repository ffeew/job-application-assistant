import type {
  UserProfileResponse,
  WorkExperienceResponse,
  EducationResponse,
  SkillResponse,
  ProjectResponse,
  CertificationResponse,
  AchievementResponse,
  ResumeContentSelection,
} from '@/app/api/profile/validators';

interface ResumeData {
  profile: UserProfileResponse | null;
  workExperiences: WorkExperienceResponse[];
  education: EducationResponse[];
  skills: SkillResponse[];
  projects: ProjectResponse[];
  certifications: CertificationResponse[];
  achievements: AchievementResponse[];
  contentSelection: ResumeContentSelection;
}

export function generateProfessionalResumeHTML(data: ResumeData, title: string): string {
  const { profile, workExperiences, education, skills, projects, certifications, achievements, contentSelection } = data;

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "";
    const [year, month] = dateString.split("-");
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return `${months[parseInt(month) - 1]} ${year}`;
  };

  const formatDateRange = (startDate: string | null, endDate: string | null, isCurrent: boolean = false) => {
    const start = startDate ? formatDate(startDate) : "";
    const end = isCurrent ? "Present" : endDate ? formatDate(endDate) : "";
    if (start && end) return `${start} - ${end}`;
    if (start) return start;
    return "";
  };

  const escapeHtml = (text: string) => {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  };

  // Filter data based on content selection
  const filteredWorkExperiences = contentSelection.includeWorkExperience 
    ? workExperiences.filter(exp => 
        !contentSelection.workExperienceIds || 
        contentSelection.workExperienceIds.includes(exp.id)
      )
    : [];

  const filteredEducation = contentSelection.includeEducation
    ? education.filter(edu => 
        !contentSelection.educationIds || 
        contentSelection.educationIds.includes(edu.id)
      )
    : [];

  const filteredSkills = contentSelection.includeSkills
    ? skills.filter(skill => 
        !contentSelection.skillCategories || 
        contentSelection.skillCategories.includes(skill.category)
      )
    : [];

  const filteredProjects = contentSelection.includeProjects
    ? projects.filter(project => 
        !contentSelection.projectIds || 
        contentSelection.projectIds.includes(project.id)
      )
    : [];

  const filteredCertifications = contentSelection.includeCertifications
    ? certifications.filter(cert => 
        !contentSelection.certificationIds || 
        contentSelection.certificationIds.includes(cert.id)
      )
    : [];

  const filteredAchievements = contentSelection.includeAchievements
    ? achievements.filter(achievement => 
        !contentSelection.achievementIds || 
        contentSelection.achievementIds.includes(achievement.id)
      )
    : [];

  // Group skills by category
  const skillsByCategory = filteredSkills.reduce((acc, skill) => {
    if (!acc[skill.category]) acc[skill.category] = [];
    acc[skill.category].push(skill);
    return acc;
  }, {} as Record<string, SkillResponse[]>);

  const css = `
    .resume-container {
      max-width: 8.5in;
      min-height: 11in;
      max-height: 11in;
      margin: 0 auto;
      padding: 0.5in;
      font-family: 'Georgia', serif;
      font-size: 11px;
      line-height: 1.4;
      color: #333;
      background: white;
      box-sizing: border-box;
      overflow: hidden;
    }

    .header {
      text-align: center;
      margin-bottom: 20px;
      border-bottom: 2px solid #2c3e50;
      padding-bottom: 15px;
    }

    .name {
      font-size: 24px;
      font-weight: bold;
      color: #2c3e50;
      margin-bottom: 8px;
      letter-spacing: 1px;
    }

    .contact-info {
      font-size: 10px;
      color: #555;
      display: flex;
      justify-content: center;
      gap: 15px;
      flex-wrap: wrap;
    }

    .contact-item {
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .section {
      margin-bottom: 16px;
    }

    .section-title {
      font-size: 14px;
      font-weight: bold;
      color: #2c3e50;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      border-bottom: 1px solid #bdc3c7;
      padding-bottom: 4px;
      margin-bottom: 10px;
    }

    .summary {
      font-style: italic;
      line-height: 1.5;
      margin-bottom: 4px;
    }

    .experience-item, .education-item, .project-item, .certification-item, .achievement-item {
      margin-bottom: 12px;
      page-break-inside: avoid;
    }

    .item-header {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      margin-bottom: 2px;
    }

    .item-title {
      font-weight: bold;
      color: #2c3e50;
      font-size: 12px;
    }

    .item-subtitle {
      font-style: italic;
      color: #7f8c8d;
      font-size: 11px;
    }

    .item-date {
      font-size: 10px;
      color: #95a5a6;
      white-space: nowrap;
    }

    .item-location {
      font-size: 10px;
      color: #7f8c8d;
    }

    .item-description {
      margin-top: 4px;
      line-height: 1.4;
    }

    .item-description ul {
      margin: 0;
      padding-left: 15px;
    }

    .item-description li {
      margin-bottom: 2px;
    }

    .technologies {
      font-size: 10px;
      color: #7f8c8d;
      font-style: italic;
      margin-top: 4px;
    }

    .skills-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 8px;
    }

    .skill-category {
      margin-bottom: 6px;
    }

    .skill-category-title {
      font-weight: bold;
      font-size: 11px;
      color: #2c3e50;
      margin-bottom: 2px;
    }

    .skill-list {
      font-size: 10px;
      color: #555;
      line-height: 1.3;
    }

    .links {
      display: flex;
      gap: 10px;
      font-size: 10px;
      margin-top: 4px;
    }

    .link {
      color: #3498db;
      text-decoration: none;
    }

    @media print {
      .resume-container {
        max-height: none;
        margin: 0;
        padding: 0.5in;
        box-shadow: none;
      }
      
      .section {
        page-break-inside: avoid;
      }
      
      .experience-item, .education-item, .project-item {
        page-break-inside: avoid;
      }
    }
  `;

  let headerHtml = '';
  if (contentSelection.includePersonalInfo && profile) {
    const contactItems = [];
    if (profile.email) contactItems.push(`<div class="contact-item">${escapeHtml(profile.email)}</div>`);
    if (profile.phone) contactItems.push(`<div class="contact-item">${escapeHtml(profile.phone)}</div>`);
    if (profile.city && profile.state) contactItems.push(`<div class="contact-item">${escapeHtml(profile.city)}, ${escapeHtml(profile.state)}</div>`);
    if (profile.linkedinUrl) contactItems.push(`<div class="contact-item"><a href="${escapeHtml(profile.linkedinUrl)}" class="link">LinkedIn</a></div>`);
    if (profile.githubUrl) contactItems.push(`<div class="contact-item"><a href="${escapeHtml(profile.githubUrl)}" class="link">GitHub</a></div>`);
    if (profile.portfolioUrl) contactItems.push(`<div class="contact-item"><a href="${escapeHtml(profile.portfolioUrl)}" class="link">Portfolio</a></div>`);

    headerHtml = `
      <div class="header">
        <div class="name">${escapeHtml(profile.firstName || '')} ${escapeHtml(profile.lastName || '')}</div>
        <div class="contact-info">
          ${contactItems.join('')}
        </div>
      </div>
    `;
  }

  let summaryHtml = '';
  if (contentSelection.includeSummary && profile?.professionalSummary) {
    summaryHtml = `
      <div class="section">
        <div class="section-title">Professional Summary</div>
        <div class="summary">${escapeHtml(profile.professionalSummary)}</div>
      </div>
    `;
  }

  let experienceHtml = '';
  if (contentSelection.includeWorkExperience && filteredWorkExperiences.length > 0) {
    const experienceItems = filteredWorkExperiences.map(experience => {
      const descriptionLines = experience.description?.split('\n').map(line => 
        `<div>${escapeHtml(line)}</div>`
      ).join('') || '';

      return `
        <div class="experience-item">
          <div class="item-header">
            <div>
              <div class="item-title">${escapeHtml(experience.jobTitle)}</div>
              <div class="item-subtitle">${escapeHtml(experience.company)}</div>
              ${experience.location ? `<div class="item-location">${escapeHtml(experience.location)}</div>` : ''}
            </div>
            <div class="item-date">
              ${formatDateRange(experience.startDate, experience.endDate, experience.isCurrent)}
            </div>
          </div>
          ${experience.description ? `<div class="item-description">${descriptionLines}</div>` : ''}
          ${experience.technologies ? `<div class="technologies">Technologies: ${escapeHtml(experience.technologies)}</div>` : ''}
        </div>
      `;
    }).join('');

    experienceHtml = `
      <div class="section">
        <div class="section-title">Professional Experience</div>
        ${experienceItems}
      </div>
    `;
  }

  let educationHtml = '';
  if (contentSelection.includeEducation && filteredEducation.length > 0) {
    const educationItems = filteredEducation.map(edu => {
      return `
        <div class="education-item">
          <div class="item-header">
            <div>
              <div class="item-title">${escapeHtml(edu.degree)}</div>
              ${edu.fieldOfStudy ? `<div class="item-subtitle">${escapeHtml(edu.fieldOfStudy)}</div>` : ''}
              <div class="item-subtitle">${escapeHtml(edu.institution)}</div>
              ${edu.location ? `<div class="item-location">${escapeHtml(edu.location)}</div>` : ''}
            </div>
            <div class="item-date">
              ${formatDateRange(edu.startDate, edu.endDate)}
            </div>
          </div>
          ${(edu.gpa || edu.honors) ? `
            <div class="item-description">
              ${edu.gpa ? `<div>GPA: ${escapeHtml(edu.gpa)}</div>` : ''}
              ${edu.honors ? `<div>${escapeHtml(edu.honors)}</div>` : ''}
            </div>
          ` : ''}
          ${edu.relevantCoursework ? `
            <div class="item-description">
              <div>Relevant Coursework: ${escapeHtml(edu.relevantCoursework)}</div>
            </div>
          ` : ''}
        </div>
      `;
    }).join('');

    educationHtml = `
      <div class="section">
        <div class="section-title">Education</div>
        ${educationItems}
      </div>
    `;
  }

  let skillsHtml = '';
  if (contentSelection.includeSkills && filteredSkills.length > 0) {
    const skillCategories = Object.entries(skillsByCategory).map(([category, categorySkills]) => {
      return `
        <div class="skill-category">
          <div class="skill-category-title">
            ${category.charAt(0).toUpperCase() + category.slice(1)}:
          </div>
          <div class="skill-list">
            ${categorySkills.map(skill => escapeHtml(skill.name)).join(', ')}
          </div>
        </div>
      `;
    }).join('');

    skillsHtml = `
      <div class="section">
        <div class="section-title">Technical Skills</div>
        <div class="skills-grid">
          ${skillCategories}
        </div>
      </div>
    `;
  }

  let projectsHtml = '';
  if (contentSelection.includeProjects && filteredProjects.length > 0) {
    const projectItems = filteredProjects.map(project => {
      const links = [];
      if (project.projectUrl) links.push(`<a href="${escapeHtml(project.projectUrl)}" class="link">Live Demo</a>`);
      if (project.githubUrl) links.push(`<a href="${escapeHtml(project.githubUrl)}" class="link">GitHub</a>`);

      return `
        <div class="project-item">
          <div class="item-header">
            <div>
              <div class="item-title">${escapeHtml(project.title)}</div>
              ${links.length > 0 ? `<div class="links">${links.join('')}</div>` : ''}
            </div>
            <div class="item-date">
              ${formatDateRange(project.startDate, project.endDate, project.isOngoing)}
            </div>
          </div>
          ${project.description ? `<div class="item-description">${escapeHtml(project.description)}</div>` : ''}
          ${project.technologies ? `<div class="technologies">Technologies: ${escapeHtml(project.technologies)}</div>` : ''}
        </div>
      `;
    }).join('');

    projectsHtml = `
      <div class="section">
        <div class="section-title">Notable Projects</div>
        ${projectItems}
      </div>
    `;
  }

  let certificationsHtml = '';
  if (contentSelection.includeCertifications && filteredCertifications.length > 0) {
    const certificationItems = filteredCertifications.map(cert => {
      return `
        <div class="certification-item">
          <div class="item-header">
            <div>
              <div class="item-title">${escapeHtml(cert.name)}</div>
              <div class="item-subtitle">${escapeHtml(cert.issuingOrganization)}</div>
              ${cert.credentialId ? `<div class="item-location">ID: ${escapeHtml(cert.credentialId)}</div>` : ''}
            </div>
            <div class="item-date">
              ${cert.issueDate ? formatDate(cert.issueDate) : ''}
              ${cert.expirationDate ? ` - ${formatDate(cert.expirationDate)}` : ''}
            </div>
          </div>
          ${cert.credentialUrl ? `
            <div class="links">
              <a href="${escapeHtml(cert.credentialUrl)}" class="link">View Credential</a>
            </div>
          ` : ''}
        </div>
      `;
    }).join('');

    certificationsHtml = `
      <div class="section">
        <div class="section-title">Certifications</div>
        ${certificationItems}
      </div>
    `;
  }

  let achievementsHtml = '';
  if (contentSelection.includeAchievements && filteredAchievements.length > 0) {
    const achievementItems = filteredAchievements.map(achievement => {
      return `
        <div class="achievement-item">
          <div class="item-header">
            <div>
              <div class="item-title">${escapeHtml(achievement.title)}</div>
              ${achievement.organization ? `<div class="item-subtitle">${escapeHtml(achievement.organization)}</div>` : ''}
            </div>
            <div class="item-date">
              ${achievement.date ? formatDate(achievement.date) : ''}
            </div>
          </div>
          ${achievement.description ? `<div class="item-description">${escapeHtml(achievement.description)}</div>` : ''}
          ${achievement.url ? `
            <div class="links">
              <a href="${escapeHtml(achievement.url)}" class="link">View Details</a>
            </div>
          ` : ''}
        </div>
      `;
    }).join('');

    achievementsHtml = `
      <div class="section">
        <div class="section-title">Awards & Achievements</div>
        ${achievementItems}
      </div>
    `;
  }

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${escapeHtml(title)}</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        body {
          font-family: 'Georgia', serif;
          line-height: 1.4;
          color: #333;
          background: white;
        }
        
        @page {
          size: letter;
          margin: 0;
        }
        
        @media print {
          body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        }

        ${css}
      </style>
    </head>
    <body>
      <div class="resume-container">
        ${headerHtml}
        ${summaryHtml}
        ${experienceHtml}
        ${educationHtml}
        ${skillsHtml}
        ${projectsHtml}
        ${certificationsHtml}
        ${achievementsHtml}
      </div>
    </body>
    </html>
  `;
}