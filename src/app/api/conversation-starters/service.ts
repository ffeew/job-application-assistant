import { createGroq } from "@ai-sdk/groq";
import { generateText } from "ai";
import { env } from "@/lib/env";
import type { UserProfileResponse } from "@/app/api/profile/validators";
import type { ResumeResponse } from "@/app/api/resumes/validators";
import type {
  GenerateConversationStarterRequest,
  GenerateConversationStarterResponse,
} from "./validators";

const DEFAULT_MODEL = "llama3-8b-8192";

type ResumeContent = {
  personalInfo?: {
    name?: string;
    email?: string;
    phone?: string;
    address?: string;
  };
  summary?: string;
  experience?: string;
  education?: string;
  skills?: string;
};

const truncate = (text: string, max = 600) => {
  if (text.length <= max) return text;
  return `${text.slice(0, max).replace(/\s+\S*$/, "")}...`;
};

const safeParseResumeContent = (
  resume: ResumeResponse | null,
): ResumeContent | null => {
  if (!resume?.content) return null;
  try {
    const parsed = JSON.parse(resume.content);
    return parsed && typeof parsed === "object" ? (parsed as ResumeContent) : null;
  } catch {
    return null;
  }
};

const buildProfileSummary = (
  profile: UserProfileResponse | null,
  resume: ResumeResponse | null,
) => {
  const resumeContent = safeParseResumeContent(resume);

  const preferredName =
    [profile?.firstName, profile?.lastName]
      .filter((part): part is string => Boolean(part && part.trim().length > 0))
      .join(" ") ||
    (resumeContent?.personalInfo?.name?.trim()
      ? resumeContent.personalInfo.name.trim()
      : undefined);

  const summaryLines = [
    preferredName ? `Name: ${preferredName}` : null,
    profile?.professionalSummary
      ? `Professional summary: ${profile.professionalSummary}`
      : resumeContent?.summary
        ? `Professional summary: ${truncate(resumeContent.summary, 400)}`
        : null,
    profile?.city || profile?.country
      ? `Location: ${[profile?.city, profile?.country]
          .filter((part): part is string =>
            Boolean(part && part.trim().length > 0),
          )
          .join(", ")}`
      : null,
    resumeContent?.experience
      ? `Recent experience highlights: ${truncate(resumeContent.experience, 500)}`
      : null,
    resumeContent?.skills
      ? `Key skills: ${truncate(resumeContent.skills, 250)}`
      : null,
  ].filter((line): line is string => Boolean(line));

  if (summaryLines.length === 0) {
    return "The sender has not provided profile or resume details.";
  }

  return summaryLines.join("\n");
};

export class ConversationStartersService {
  private model = env.GROQ_MODEL || DEFAULT_MODEL;

  async generateConversationStarter(
    profile: UserProfileResponse | null,
    resume: ResumeResponse | null,
    data: GenerateConversationStarterRequest,
  ): Promise<GenerateConversationStarterResponse> {
    if (!env.GROQ_API_KEY) {
      throw new Error(
        "AI service not configured. Please contact the workspace administrator.",
      );
    }

    const { prospectDetails, additionalContext } = data;

    const profileSummary = buildProfileSummary(profile, resume);

    const prompt = `You are a seasoned networking coach who helps professionals open LinkedIn conversations with authenticity.

Prospect information (verbatim from the user):
${prospectDetails}

Sender profile pulled from their account:
${profileSummary}

Extra notes from the sender:
${additionalContext || "None provided"}

Write a short LinkedIn message (2-4 sentences) that:
- Opens with a warm greeting and the recipient's name if available.
- References specific details from the prospect information.
- Connects the sender's background to the prospect's interests or work.
- Clearly states why the sender is reaching out and proposes a light next step (e.g., short chat, learning more).
- Sounds natural, friendly, and personal—no generic praise or salesy language.
- Ends with the sender's name if it is provided above.

Return only the message text and avoid placeholders or brackets.`;

    try {
      const groq = createGroq({
        apiKey: env.GROQ_API_KEY,
      });

      const result = await generateText({
        model: groq(this.model),
        prompt,
        temperature: 0.65,
        maxOutputTokens: 600,
      });

      return {
        message: result.text.trim(),
        success: true,
      };
    } catch (error) {
      console.error("AI conversation starter generation error:", error);
      throw new Error("Failed to generate conversation starter. Please try again.");
    }
  }
}
