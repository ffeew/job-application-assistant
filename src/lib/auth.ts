import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { APIError, isAPIError } from "better-auth/api";
import { nextCookies } from "better-auth/next-js";
import { Resend } from "resend";
import { db } from "./db/db";
import { env } from "./env";
import { logger } from "./logger";

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
    logger.info(
      { to, subject, text },
      "RESEND_API_KEY is not set; email logged instead of sent",
    );
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
    logger.error({ err: failure }, "Failed to send email via Resend");
    throw new Error("Failed to send email. Please try again later.");
  }
}

const authLogger = logger.child({ component: "better-auth" });

export const auth = betterAuth({
  baseURL: env.BETTER_AUTH_URL,
  secret: env.BETTER_AUTH_SECRET,
  trustedOrigins: [new URL(env.BETTER_AUTH_URL).origin],
  logger: {
    // Better Auth appends a failure to its message as an extra argument; pino
    // serializes an error only under `err`.
    log: (level, message, ...details: unknown[]) => {
      const err = details.find((detail) => detail instanceof Error);
      const rest = details.filter((detail) => detail !== err);
      authLogger[level](
        { err, ...(rest.length > 0 && { details: rest }) },
        message,
      );
    },
  },
  onAPIError: {
    onError: (error) => {
      const refusal = isAPIError(error);
      if (refusal && error.status !== "INTERNAL_SERVER_ERROR") return;
      authLogger.error({ err: error }, "Authentication request failed");
      // Left unanswered, the router prints an unexpected error with
      // console.error. Throwing an APIError answers the request instead.
      if (!refusal) throw new APIError("INTERNAL_SERVER_ERROR");
    },
  },
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
    // A reset often follows a leaked password, so sessions opened with the
    // old one end too.
    revokeSessionsOnPasswordReset: true,
  },
  plugins: [nextCookies()], // Keep this last so cookies set by other plugins reach Next.js.
});
