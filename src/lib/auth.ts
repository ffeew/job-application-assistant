import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { Resend } from "resend";
import { db } from "./db/db";
import { env } from "./env";

async function sendEmail({
  to,
  subject,
  text,
}: {
  to: string;
  subject: string;
  text: string;
}) {
  if (!env.RESEND_API_KEY) {
    console.log(`
[DEV] Email would be sent to: ${to}
Subject: ${subject}
Content: ${text}
    `);
    return;
  }

  const resend = new Resend(env.RESEND_API_KEY);
  const fromEmail = env.RESEND_FROM_EMAIL || "noreply@example.com";

  // The SDK reports a rejected request in its result instead of throwing, so
  // both outcomes are checked; otherwise a failed send looks like a sent email.
  let failure: unknown;
  try {
    const result = await resend.emails.send({
      from: `Job Application Assistant <${fromEmail}>`,
      to,
      subject,
      text,
    });
    failure = result.error;
  } catch (error) {
    failure = error;
  }
  if (failure) {
    console.error("Failed to send email via Resend:", failure);
    throw new Error("Failed to send email. Please try again later.");
  }
}

export const auth = betterAuth({
  baseURL: env.BETTER_AUTH_URL,
  secret: env.BETTER_AUTH_SECRET,
  trustedOrigins: [new URL(env.BETTER_AUTH_URL).origin],
  database: drizzleAdapter(db, {
    provider: "pg",
  }),
  emailAndPassword: {
    enabled: true,
    disableSignUp: env.DISABLE_SIGNUP,
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
    resetPasswordTokenExpiresIn: 3600,
  },
  plugins: [nextCookies()], // Keep this last so cookies set by other plugins reach Next.js.
});
