"use server";

import { z } from "zod";
import { signup as signupSvc, verifyEmailOtp as verifySvc, loginPassword as loginPwdSvc, loginVerifyEmailOtp as loginOtpSvc, resendSignupOtp } from "@/services/auth";
import { cookies } from "next/headers";
import { db, tables } from "@/db/client";
import { eq } from "drizzle-orm";
import * as argon2 from "@node-rs/argon2";

export async function signupAction(formData: FormData) {
  const schema = z.object({
    email: z.string().email(),
    password: z.string().min(8),
  });
  const input = {
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("password") ?? ""),
  };
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.message } as const;
  try {
    // Create minimal user record with just email/password and send OTP
    await signupSvc(parsed.data);
    return { ok: true } as const;
  } catch (e: any) {
    return { ok: false, error: e.message ?? "Failed" } as const;
  }
}

export async function resendSignupOtpAction(formData: FormData) {
  const schema = z.object({ email: z.string().email() });
  const input = { email: String(formData.get("email") ?? "") };
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.message } as const;
  try {
    await resendSignupOtp(parsed.data.email);
    return { ok: true } as const;
  } catch (e: any) {
    return { ok: false, error: e.message ?? "Failed" } as const;
  }
}

export async function verifyEmailOtpAction(formData: FormData) {
  const schema = z.object({ email: z.string().email(), code: z.string().length(6) });
  const input = { email: String(formData.get("email") ?? ""), code: String(formData.get("code") ?? "") };
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.message } as const;
  try {
    await verifySvc(parsed.data.email, parsed.data.code);
    return { ok: true } as const;
  } catch (e: any) {
    return { ok: false, error: e.message ?? "Failed" } as const;
  }
}

export async function loginPasswordAction(formData: FormData) {
  const schema = z.object({ 
    email: z.string().email(), 
    password: z.string().min(1),
    remember: z.string().optional()
  });
  const input = { 
    email: String(formData.get("email") ?? ""), 
    password: String(formData.get("password") ?? ""),
    remember: String(formData.get("remember") ?? "")
  };
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.message } as const;
  try {
    const user = await loginPwdSvc({ email: parsed.data.email, password: parsed.data.password });
    const store = await cookies();
    
    // Set cookie duration based on remember me checkbox
    const maxAge = parsed.data.remember === "on" 
      ? 60 * 60 * 24 * 30 // 30 days if remember me is checked
      : 60 * 60 * 24; // 1 day if not checked
    
    store.set("auth_user", JSON.stringify(user), {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge,
    });
    return { ok: true, user } as const;
  } catch (e: any) {
    return { ok: false, error: e.message ?? "Failed" } as const;
  }
}

export async function loginVerifyOtpAction(formData: FormData) {
  const schema = z.object({ email: z.string().email(), code: z.string().length(6) });
  const input = { email: String(formData.get("email") ?? ""), code: String(formData.get("code") ?? "") };
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.message } as const;
  try {
    const user = await loginOtpSvc(parsed.data.email, parsed.data.code);
    const store = await cookies();
    store.set("auth_user", JSON.stringify(user), {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      // 30 days persistence
      maxAge: 60 * 60 * 24 * 30,
    });
    return { ok: true, user } as const;
  } catch (e: any) {
    return { ok: false, error: e.message ?? "Failed" } as const;
  }
}

export async function completeProfileAction(formData: FormData) {
  const schema = z.object({
    email: z.string().email(),
    name: z.string().min(2),
    schoolName: z.string().min(2),
    schoolAddress: z.string().min(2),
    schoolContact: z.string().min(5),
    estb: z.string().min(1),
    regNumber: z.string().min(1),
    principalName: z.string().min(2),
    principalContact: z.string().min(5),
  });
  const input = {
    email: String(formData.get("email") ?? ""),
    name: String(formData.get("name") ?? ""),
    schoolName: String(formData.get("schoolName") ?? ""),
    schoolAddress: String(formData.get("schoolAddress") ?? ""),
    schoolContact: String(formData.get("schoolContact") ?? ""),
    estb: String(formData.get("estb") ?? ""),
    regNumber: String(formData.get("regNumber") ?? ""),
    principalName: String(formData.get("principalName") ?? ""),
    principalContact: String(formData.get("principalContact") ?? ""),
  };
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.message } as const;
  
  try {
    // Update user profile with complete details
    await db.update(tables.users)
      .set({
        name: parsed.data.name,
        schoolName: parsed.data.schoolName,
        schoolAddress: parsed.data.schoolAddress,
        schoolContact: parsed.data.schoolContact,
        estb: parsed.data.estb,
        regNumber: parsed.data.regNumber,
        principalName: parsed.data.principalName,
        principalContact: parsed.data.principalContact,
        updatedAt: new Date()
      })
      .where(eq(tables.users.email, parsed.data.email));
    
    // Get updated user and auto-login
    const user = (await db.select().from(tables.users).where(eq(tables.users.email, parsed.data.email)).limit(1))[0];
    if (!user) throw new Error("User not found");
    
    const store = await cookies();
    store.set("auth_user", JSON.stringify({ id: user.id, name: user.name, email: user.email }), {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
    return { ok: true, user: { id: user.id, name: user.name, email: user.email } } as const;
  } catch (e: any) {
    return { ok: false, error: e.message ?? "Failed to complete profile" } as const;
  }
}

export async function forgotPasswordAction(formData: FormData) {
  const schema = z.object({ email: z.string().email() });
  const input = { email: String(formData.get("email") ?? "") };
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.message } as const;
  
  try {
    // Check if user exists
    const user = await db.select().from(tables.users).where(eq(tables.users.email, parsed.data.email)).limit(1);
    if (user.length === 0) {
      // Don't reveal if email exists or not for security
      return { ok: true, message: "If an account with this email exists, you will receive a password reset link." } as const;
    }
    
    // Generate secure reset token
    const resetToken = crypto.randomUUID() + "-" + Date.now();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour expiry
    
    // Delete any existing reset tokens for this email
    await db.delete(tables.passwordResetTokens).where(eq(tables.passwordResetTokens.email, parsed.data.email));
    
    // Create new reset token
    await db.insert(tables.passwordResetTokens).values({
      email: parsed.data.email,
      token: resetToken,
      expiresAt,
    });
    
    // Send reset email (you'll need to implement email service)
    await sendPasswordResetEmail(parsed.data.email, resetToken);
    
    return { ok: true, message: "If an account with this email exists, you will receive a password reset link." } as const;
  } catch (e: any) {
    console.error("Forgot password error:", e);
    return { ok: false, error: "Failed to process request" } as const;
  }
}

export async function resetPasswordAction(formData: FormData) {
  const schema = z.object({ 
    token: z.string().min(1),
    password: z.string().min(8),
    confirmPassword: z.string().min(8)
  });
  const input = { 
    token: String(formData.get("token") ?? ""),
    password: String(formData.get("password") ?? ""),
    confirmPassword: String(formData.get("confirmPassword") ?? "")
  };
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.message } as const;
  
  if (parsed.data.password !== parsed.data.confirmPassword) {
    return { ok: false, error: "Passwords do not match" } as const;
  }
  
  try {
    // Find valid reset token
    const resetToken = await db
      .select()
      .from(tables.passwordResetTokens)
      .where(eq(tables.passwordResetTokens.token, parsed.data.token))
      .limit(1);
    
    if (resetToken.length === 0 || resetToken[0].usedAt || resetToken[0].expiresAt < new Date()) {
      return { ok: false, error: "Invalid or expired reset token" } as const;
    }
    
    // Hash new password using Argon2 (fast native implementation)
    const passwordHash = await argon2.hash(parsed.data.password);
    
    // Update user password
    await db
      .update(tables.users)
      .set({ passwordHash, updatedAt: new Date() })
      .where(eq(tables.users.email, resetToken[0].email));
    
    // Mark token as used
    await db
      .update(tables.passwordResetTokens)
      .set({ usedAt: new Date() })
      .where(eq(tables.passwordResetTokens.token, parsed.data.token));
    
    return { ok: true, message: "Password reset successfully" } as const;
  } catch (e: any) {
    console.error("Reset password error:", e);
    return { ok: false, error: "Failed to reset password" } as const;
  }
}

// Email service function (placeholder - implement with your email provider)
async function sendPasswordResetEmail(email: string, token: string) {
  // TODO: Implement with your email service (Resend, SendGrid, etc.)
  const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/reset-password?token=${token}`;
  
  console.log(`Password reset email would be sent to ${email}`);
  console.log(`Reset URL: ${resetUrl}`);
  
  // For now, just log the reset URL
  // In production, replace this with actual email sending logic
}

export async function logoutAction() {
  const store = await cookies();
  store.set("auth_user", "", { path: "/", maxAge: 0 });
  return { ok: true } as const;
}
