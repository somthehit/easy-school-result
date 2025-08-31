"use server";

import { db, tables } from "@/db/client";
import { eq, and, inArray, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAuthUser } from "../actions";

export async function createClassAction(formData: FormData) {
  try {
    const { id: userId } = await requireAuthUser();
    const schema = z.object({
      name: z.string().min(1, "Name is required"),
      year: z.coerce.number().int().min(1900, "Year must be >= 1900").max(3000, "Year must be <= 3000"),
      section: z.string().optional(),
    });
    const input = {
      name: String(formData.get("name") ?? "").trim(),
      year: formData.get("year"),
      section: (() => {
        const s = String(formData.get("section") ?? "").trim();
        return s === "" ? undefined : s;
      })(),
    } as any;
    const parsed = schema.safeParse(input);
    if (!parsed.success) redirect(`/dashboard/classes?error=${encodeURIComponent(parsed.error.message)}`);
    
    // Check for duplicate class (same name, year, section for this user)
    const existing = await db
      .select({ id: tables.classes.id })
      .from(tables.classes)
      .where(
        and(
          eq(tables.classes.userId as any, userId as any),
          eq(tables.classes.name, parsed.data!.name),
          eq(tables.classes.year, parsed.data!.year),
          parsed.data!.section 
            ? eq(tables.classes.section, parsed.data!.section)
            : isNull(tables.classes.section)
        )
      )
      .limit(1);
    
    if (existing.length > 0) {
      redirect(`/dashboard/classes?error=${encodeURIComponent("Class with same name, year, and section already exists")}`);
    }
    
    await db.insert(tables.classes).values({
      name: parsed.data!.name,
      year: parsed.data!.year,
      section: parsed.data!.section ?? null,
      userId,
    });
    revalidatePath("/dashboard/classes");
    redirect(`/dashboard/classes?saved=1`);
  } catch (e: any) {
    const msg = e?.message ? String(e.message) : "Failed to create class";
    redirect(`/dashboard/classes?error=${encodeURIComponent(msg)}`);
  }
}

export async function updateClassAction(formData: FormData) {
  try {
    const { id: userId } = await requireAuthUser();
    const schema = z.object({
      id: z.string().min(1),
      name: z.string().min(1, "Name is required"),
      year: z.coerce.number().int().min(1900, "Year must be >= 1900").max(3000, "Year must be <= 3000"),
      section: z.string().optional(),
    });
    const input = {
      id: String(formData.get("id") ?? "").trim(),
      name: String(formData.get("name") ?? "").trim(),
      year: formData.get("year"),
      section: (() => {
        const s = String(formData.get("section") ?? "").trim();
        return s === "" ? undefined : s;
      })(),
    } as any;
    const parsed = schema.safeParse(input);
    if (!parsed.success) redirect(`/dashboard/classes?error=${encodeURIComponent(parsed.error.message)}`);
    await db
      .update(tables.classes)
      .set({ name: parsed.data!.name, year: parsed.data!.year, section: parsed.data!.section ?? null })
      .where(and(eq(tables.classes.id, parsed.data!.id as any), eq(tables.classes.userId as any, userId as any)));
    revalidatePath("/dashboard/classes");
    redirect(`/dashboard/classes?saved=1`);
  } catch (e: any) {
    const msg = e?.message ? String(e.message) : "Failed to update class";
    redirect(`/dashboard/classes?error=${encodeURIComponent(msg)}`);
  }
}

export async function deleteClassAction(formData: FormData) {
  try {
    const { id: userId } = await requireAuthUser();
    const id = String(formData.get("id") || "").trim();
    if (!id) redirect(`/dashboard/classes?error=${encodeURIComponent("Missing id")}`);
    // Ensure the class belongs to current user before checking dependents
    const owner = await db
      .select({ id: tables.classes.id })
      .from(tables.classes)
      .where(and(eq(tables.classes.id, id as any), eq(tables.classes.userId as any, userId as any)))
      .limit(1);
    if (!owner.length) redirect(`/dashboard/classes?error=${encodeURIComponent("Not found")}`);

    // Block delete if not empty
    const [hasSubject, hasStudent, hasExam, hasResult, hasEnrollment] = await Promise.all([
      db.select({ id: tables.subjects.id }).from(tables.subjects).where(eq(tables.subjects.classId, id as any)).limit(1),
      db.select({ id: tables.students.id }).from(tables.students).where(eq(tables.students.classId, id as any)).limit(1),
      db.select({ id: tables.exams.id }).from(tables.exams).where(eq(tables.exams.classId, id as any)).limit(1),
      db.select({ id: tables.results.id }).from(tables.results).where(eq(tables.results.classId, id as any)).limit(1),
      db.select({ id: tables.classEnrollments.id }).from(tables.classEnrollments).where(eq(tables.classEnrollments.classId, id as any)).limit(1),
    ]);

    if (hasSubject.length || hasStudent.length || hasExam.length || hasResult.length || hasEnrollment.length) {
      redirect(`/dashboard/classes?error=${encodeURIComponent("Cannot delete class with subjects/students/exams/results/enrollments. Remove dependent records first.")}`);
    }

    // Safe to delete class and any enrollments (should be none, but ensure cleanup)
    await db.transaction(async (tx) => {
      await tx.delete(tables.classEnrollments).where(eq(tables.classEnrollments.classId, id as any));
      await tx.delete(tables.classes).where(and(eq(tables.classes.id, id as any), eq(tables.classes.userId as any, userId as any)));
    });
    revalidatePath("/dashboard/classes");
    redirect(`/dashboard/classes?saved=1`);
  } catch (e: any) {
    const msg = e?.message ? String(e.message) : "Failed to delete class";
    redirect(`/dashboard/classes?error=${encodeURIComponent(msg)}`);
  }
}
