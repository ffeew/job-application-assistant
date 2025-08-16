import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { db } from "./db/db";

// Basic email sending function (replace with your email service)
async function sendEmail({ to, subject, text }: { to: string; subject: string; text: string }) {
  // TODO: Replace with actual email service (Resend, SendGrid, etc.)
  console.log(`
Email would be sent to: ${to}
Subject: ${subject}
Content: ${text}
  `);
  
  // For development, we'll just log the email
  // In production, integrate with your email service:
  // - Resend: https://resend.com/
  // - SendGrid: https://sendgrid.com/
  // - NodeMailer with SMTP
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