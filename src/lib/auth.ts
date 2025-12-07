import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { Resend } from "resend";
import { db } from "./db/db";
import { env } from "./env";

// Email sending function with Resend integration
async function sendEmail({ to, subject, text }: { to: string; subject: string; text: string }) {
  // If Resend API key is not configured, log to console (development mode)
  if (!env.RESEND_API_KEY) {
    console.log(`
[DEV] Email would be sent to: ${to}
Subject: ${subject}
Content: ${text}
    `);
    return;
  }

  // Send email using Resend in production
  const resend = new Resend(env.RESEND_API_KEY);
  const fromEmail = env.RESEND_FROM_EMAIL || "noreply@example.com";

  try {
    await resend.emails.send({
      from: `Job Application Assistant <${fromEmail}>`,
      to,
      subject,
      text,
    });
  } catch (error) {
    console.error("Failed to send email via Resend:", error);
    throw new Error("Failed to send email. Please try again later.");
  }
}

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "sqlite",
  }),
  emailAndPassword: {
    enabled: true,
    sendResetPassword: async ({ user, url }) => {
      await sendEmail({
        to: user.email,
        subject: "Reset your password - Job Application Assistant",
        text: `Hello,

You requested to reset your password for your Job Application Assistant account.

Click the link below to reset your password:
${url}

This link will expire in 1 hour.

If you didn't request this password reset, please ignore this email.

Best regards,
Job Application Assistant Team`,
      });
    },
    resetPasswordTokenExpiresIn: 3600, // 1 hour
  },
  plugins: [nextCookies()], // This should be the last plugin
});