import { addMinutes, isBefore } from "date-fns";
import { db, tables } from "@/db/client";
import { eq, and, gt, desc, sql } from "drizzle-orm";
import { sendOtpEmail } from "./mailer";

const EXPIRY_MIN = 5;
const MAX_PER_HOUR = 3;
const MAX_WRONG_ATTEMPTS = 5;
const LOCK_MIN = 15;

function generateCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function issueOtp(email: string, purpose: "signup" | "login" | "reset") {
  // Rate limit: max 3 per hour
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(tables.emailOtps)
    .where(and(eq(tables.emailOtps.email, email), gt(tables.emailOtps.createdAt, oneHourAgo)));

  if ((count ?? 0) >= MAX_PER_HOUR) {
    throw new Error("Too many OTP requests. Try again later.");
  }

  const code = generateCode();
  const expiresAt = addMinutes(new Date(), EXPIRY_MIN);
  await db.insert(tables.emailOtps).values({ email, code, purpose, expiresAt });
  await sendOtpEmail(email, code, purpose);
}

export async function verifyOtp(email: string, code: string, purpose: string) {
  // Find latest OTP for email
  const rows = await db
    .select()
    .from(tables.emailOtps)
    .where(eq(tables.emailOtps.email, email))
    .orderBy(desc(tables.emailOtps.createdAt))
    .limit(1);

  const record = rows[0] as typeof tables.emailOtps.$inferSelect | undefined;
  if (!record) throw new Error("No OTP issued. Request a new one.");

  if (record.lockedUntil && isBefore(new Date(), new Date(record.lockedUntil))) {
    throw new Error("Too many attempts. Try later.");
  }

  if (isBefore(new Date(record.expiresAt), new Date())) {
    throw new Error("OTP expired.");
  }

  if (record.code !== code || record.purpose !== purpose) {
    const attempts = (record.attempts ?? 0) + 1;
    const patch: Partial<typeof record> = { attempts } as any;
    if (attempts >= MAX_WRONG_ATTEMPTS) {
      (patch as any).lockedUntil = addMinutes(new Date(), LOCK_MIN);
      (patch as any).attempts = 0;
    }
    await db.update(tables.emailOtps).set(patch).where(eq(tables.emailOtps.id, record.id));
    throw new Error("Invalid code.");
  }

  // success
  await db.update(tables.emailOtps).set({ attempts: 0, lockedUntil: null } as any).where(eq(tables.emailOtps.id, record.id));
}
