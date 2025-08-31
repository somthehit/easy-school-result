import nodemailer from "nodemailer";
import { env } from "@/env";
import { buildVerificationMail } from "@/lib/mail/verificationMail";

const transporter = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: env.SMTP_PORT,
  secure: env.SMTP_PORT === 465, // true for 465, false for others
  auth: {
    user: env.SMTP_USER,
    pass: env.SMTP_PASS,
  },
});

export async function sendMail(opts: { to: string; subject: string; html?: string; text?: string }) {
  const { to, subject, html, text } = opts;
  await transporter.sendMail({ from: env.SMTP_FROM, to, subject, html, text });
}

export async function sendOtpEmail(to: string, code: string, purpose: string) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const link = `${baseUrl}/verify?email=${encodeURIComponent(to)}&code=${encodeURIComponent(code)}`;
  const { subject, text, html } = buildVerificationMail(code, purpose, link);
  await sendMail({ to, subject, text, html });
}
