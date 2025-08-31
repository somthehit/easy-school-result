"use server";

import { z } from "zod";
import { cookies } from "next/headers";
import { db, tables } from "@/db/client";
import { eq } from "drizzle-orm";
import { hashPassword, verifyPassword } from "@/utils/crypto";
import { saveUploadedImage } from "@/utils/upload";

function getAuthUserSync() {
  const raw = (cookies() as any).get?.("auth_user")?.value as string | undefined;
  if (!raw) return null;
  try {
    return JSON.parse(raw) as { id: string; name: string; email: string };
  } catch {
    return null;
  }
}

export async function updateProfileAction(formData: FormData) {
  const schema = z.object({
    name: z.string().min(2),
    photoUrl: z.string().url().optional().or(z.literal("")).transform((v) => (v === "" ? null : v)),
  });
  const input = {
    name: String(formData.get("name") ?? ""),
    photoUrl: String(formData.get("photoUrl") ?? ""),
  };
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.message } as const;

  const auth = getAuthUserSync();
  if (!auth) return { ok: false, error: "Unauthorized" } as const;

  // If a photo file is uploaded, it overrides the URL input
  let finalPhotoUrl: string | null = (parsed.data as any).photoUrl ?? null;
  const uploaded = formData.get("photoFile");
  if (uploaded && typeof uploaded === "object" && (uploaded as File).arrayBuffer) {
    const file = uploaded as unknown as File;
    const size = (file as any).size ?? 0;
    if (size > 0) {
      try {
        finalPhotoUrl = await saveUploadedImage(file, "users");
      } catch (e) {
        // ignore upload failure and keep existing/typed URL
      }
    }
  }

  await db
    .update(tables.users)
    .set({
      name: parsed.data.name,
      photoUrl: finalPhotoUrl ?? null,
      updatedAt: new Date(),
    })
    .where(eq(tables.users.id, auth.id));

  return { ok: true } as const;
}

export async function updateSchoolDetailsAction(formData: FormData) {
  const schema = z.object({
    schoolName: z.string().min(2),
    schoolAddress: z.string().min(2),
    schoolContact: z.string().min(5),
    estb: z.string().min(1),
    regNumber: z.string().min(1),
    principalName: z.string().min(2),
    principalContact: z.string().min(5),
    schoolLogo: z.string().url().optional().or(z.literal("")).transform((v) => (v === "" ? null : v)),
  });
  const input = {
    schoolName: String(formData.get("schoolName") ?? ""),
    schoolAddress: String(formData.get("schoolAddress") ?? ""),
    schoolContact: String(formData.get("schoolContact") ?? ""),
    estb: String(formData.get("estb") ?? ""),
    regNumber: String(formData.get("regNumber") ?? ""),
    principalName: String(formData.get("principalName") ?? ""),
    principalContact: String(formData.get("principalContact") ?? ""),
    schoolLogo: String(formData.get("schoolLogo") ?? ""),
  };
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.message } as const;

  const auth = getAuthUserSync();
  if (!auth) return { ok: false, error: "Unauthorized" } as const;

  // If a logo file is uploaded, it overrides the URL input
  let finalLogoUrl: string | null = (parsed.data as any).schoolLogo ?? null;
  const uploaded = formData.get("schoolLogoFile");
  if (uploaded && typeof uploaded === "object" && (uploaded as File).arrayBuffer) {
    const file = uploaded as unknown as File;
    const size = (file as any).size ?? 0;
    if (size > 0) {
      try {
        finalLogoUrl = await saveUploadedImage(file, "users");
      } catch (e) {
        // ignore upload failure and keep existing/typed URL
      }
    }
  }

  await db
    .update(tables.users)
    .set({
      schoolName: parsed.data.schoolName,
      schoolAddress: parsed.data.schoolAddress,
      schoolContact: parsed.data.schoolContact,
      estb: parsed.data.estb,
      regNumber: parsed.data.regNumber,
      principalName: parsed.data.principalName,
      principalContact: parsed.data.principalContact,
      schoolLogo: finalLogoUrl ?? null,
      updatedAt: new Date(),
    })
    .where(eq(tables.users.id, auth.id));

  return { ok: true } as const;
}

export async function changePasswordAction(formData: FormData) {
  const schema = z.object({
    currentPassword: z.string().min(1),
    newPassword: z.string().min(8),
  });
  const input = {
    currentPassword: String(formData.get("currentPassword") ?? ""),
    newPassword: String(formData.get("newPassword") ?? ""),
  };
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.message } as const;

  const auth = getAuthUserSync();
  if (!auth) return { ok: false, error: "Unauthorized" } as const;

  const user = (
    await db.select().from(tables.users).where(eq(tables.users.id, auth.id)).limit(1)
  )[0];
  if (!user) return { ok: false, error: "User not found" } as const;

  const ok = await verifyPassword(user.passwordHash, parsed.data.currentPassword);
  if (!ok) return { ok: false, error: "Current password is incorrect" } as const;

  const passwordHash = await hashPassword(parsed.data.newPassword);
  await db
    .update(tables.users)
    .set({ passwordHash, updatedAt: new Date() })
    .where(eq(tables.users.id, user.id));

  return { ok: true } as const;
}
