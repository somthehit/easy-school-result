import { db, tables } from "@/db/client";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { hashPassword, verifyPassword } from "@/utils/crypto";
import { issueOtp, verifyOtp } from "./otp";
import { sendMail } from "@/services/mailer";
import { buildWelcomeMail } from "@/lib/mail/welcomeMail";

const SignupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export type SignupInput = z.infer<typeof SignupSchema>;

export async function signup(input: SignupInput) {
  const parsed = SignupSchema.safeParse(input);
  if (!parsed.success) throw new Error(parsed.error.message);
  const { email, password } = parsed.data;

  const existing = await db.select().from(tables.users).where(eq(tables.users.email, email)).limit(1);
  if (existing[0]) throw new Error("Email already registered");

  const passwordHash = await hashPassword(password);
  await db.insert(tables.users).values({ 
    email, 
    passwordHash,
    name: "",
    schoolName: "",
    schoolAddress: ""
  });
  await issueOtp(email, "signup");
}

export async function verifyEmailOtp(email: string, code: string) {
  await verifyOtp(email, code, "signup");
  await db
    .update(tables.users)
    .set({ emailVerifiedAt: new Date() })
    .where(eq(tables.users.email, email));
  // Send welcome email after successful verification
  const user = (await db.select().from(tables.users).where(eq(tables.users.email, email)).limit(1))[0];
  if (user) {
    const { subject, text, html } = buildWelcomeMail(user.name);
    try {
      await sendMail({ to: email, subject, text, html });
    } catch (e) {
      // Non-blocking: log and continue
      console.error("Failed to send welcome email", e);
    }
  }
}

export async function resendSignupOtp(email: string) {
  await issueOtp(email, "signup");
}

const LoginSchema = z.object({ email: z.string().email(), password: z.string().min(1) });
export type LoginInput = z.infer<typeof LoginSchema>;

export async function loginRequestOtp(email: string) {
  // optional flow: allow email OTP login without password
  await issueOtp(email, "login");
}

export async function loginPassword(input: LoginInput) {
  const parsed = LoginSchema.safeParse(input);
  if (!parsed.success) throw new Error(parsed.error.message);
  const { email, password } = parsed.data;

  const user = (await db.select().from(tables.users).where(eq(tables.users.email, email)).limit(1))[0];
  if (!user) throw new Error("Invalid credentials");
  if (!user.emailVerifiedAt) throw new Error("Email not verified");

  const ok = await verifyPassword(user.passwordHash, password);
  if (!ok) throw new Error("Invalid credentials");

  return { id: user.id, name: user.name, email: user.email };
}

export async function loginVerifyEmailOtp(email: string, code: string) {
  await verifyOtp(email, code, "login");
  const user = (await db.select().from(tables.users).where(eq(tables.users.email, email)).limit(1))[0];
  if (!user) throw new Error("User not found");
  if (!user.emailVerifiedAt) throw new Error("Email not verified");
  return { id: user.id, name: user.name, email: user.email };
}

// Forgot/Reset password
const ResetSchema = z.object({ email: z.string().email() });
export type ResetRequestInput = z.infer<typeof ResetSchema>;

export async function requestPasswordReset(email: string) {
  const parsed = ResetSchema.safeParse({ email });
  if (!parsed.success) throw new Error(parsed.error.message);
  const user = (await db.select().from(tables.users).where(eq(tables.users.email, parsed.data.email)).limit(1))[0];
  if (!user) return; // Do not reveal existence
  if (!user.emailVerifiedAt) throw new Error("Email not verified");
  await issueOtp(parsed.data.email, "reset");
}

const ResetConfirmSchema = z.object({ email: z.string().email(), code: z.string().length(6), password: z.string().min(8) });
export type ResetConfirmInput = z.infer<typeof ResetConfirmSchema>;

export async function resetPassword(input: ResetConfirmInput) {
  const parsed = ResetConfirmSchema.safeParse(input);
  if (!parsed.success) throw new Error(parsed.error.message);
  const { email, code, password } = parsed.data;
  await verifyOtp(email, code, "reset");
  const passwordHash = await hashPassword(password);
  await db
    .update(tables.users)
    .set({ passwordHash, updatedAt: new Date() })
    .where(eq(tables.users.email, email));
}
