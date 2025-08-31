"use server";

import { revalidatePath } from "next/cache";
import { and, eq, inArray } from "drizzle-orm";
import { db, tables } from "@/db/client";
import { requireAuthUser } from "../actions";
import { z } from "zod";

export async function createSubject(formData: FormData) {
  try {
    const { id: userId } = await requireAuthUser();

    const schema = z.object({
      name: z.string().trim().min(1, "Name is required"),
      classId: z.string().trim().min(1, "Class is required"),
      masterSubjectId: z.string().optional(),
    });

    const parsed = schema.safeParse({
      name: formData.get("name"),
      classId: formData.get("classId"),
      masterSubjectId: formData.get("masterSubjectId"),
    });

    if (!parsed.success) {
      const msg = parsed.error.issues.map((i) => i.message).join("; ");
      return { ok: false, error: msg } as const;
    }

    const data = parsed.data!;
    let masterSubjectId = data.masterSubjectId ?? undefined;

    // Ensure the class belongs to current user
    const cls = await db
      .select({ id: tables.classes.id })
      .from(tables.classes)
      .where(and(eq(tables.classes.id, data.classId as any), eq(tables.classes.userId as any, userId as any)))
      .limit(1);
    if (!cls.length) return { ok: false, error: "Invalid class" } as const;

    // If masterSubjectId not provided, create or reuse a global master subject with the same name for this user
    if (!masterSubjectId) {
      try {
        const created = (await db
          .insert(tables.masterSubjects)
          .values({ name: data.name, userId })
          .returning({ id: tables.masterSubjects.id })) as Array<{ id: string }> | undefined;
        if (created && created.length) {
          masterSubjectId = created[0].id;
        }
      } catch {
        // Likely unique violation; try to find existing master subject for this user/name
        try {
          const existing = (await db
            .select({ id: tables.masterSubjects.id })
            .from(tables.masterSubjects)
            .where(and(
              eq(tables.masterSubjects.userId as any, userId as any),
              eq(tables.masterSubjects.name as any, data.name as any)
            ))
            .limit(1)) as Array<{ id: string }>;
          masterSubjectId = existing[0]?.id ?? undefined;
        } catch {}
      }
    }

    if (!masterSubjectId) {
      return { ok: false, error: "Failed to create or find master subject" } as const;
    }

    // Check for duplicate subject (same name in same class for this user)
    const existingSubject = await db
      .select({ id: tables.subjects.id })
      .from(tables.subjects)
      .where(
        and(
          eq(tables.subjects.userId as any, userId as any),
          eq(tables.subjects.classId, data.classId as any),
          eq(tables.subjects.name, data.name)
        )
      )
      .limit(1);
    
    if (existingSubject.length > 0) {
      return { ok: false, error: "Subject with same name already exists in this class" } as const;
    }

    const [inserted] = (await db
      .insert(tables.subjects)
      .values({
        name: data.name,
        classId: data.classId,
        masterSubjectId,
        userId,
      })
      .returning({ id: tables.subjects.id })) as Array<{ id: string }>;

    // Create default parts: TH/PR
    if (inserted?.id) {
      const names = ["TH", "PR"]; // Default parts
      let order = 0;
      for (const nm of names) {
        try {
          await db.insert(tables.subjectParts).values({ subjectId: inserted.id, name: nm, sortOrder: order++, userId } as any);
        } catch {}
      }
    }
    revalidatePath("/dashboard/subjects");
    return { ok: true } as const;
  } catch (e: any) {
    const msg = e?.message ? String(e.message) : "Failed to create subject";
    return { ok: false, error: msg } as const;
  }
}

export async function createMasterSubject(formData: FormData) {
  try {
    const { id: userId } = await requireAuthUser();
    const name = String(formData.get("name") || "").trim();
    const classId = String(formData.get("classId") || "").trim();
    if (!name) return { ok: false, error: "Name is required" } as const;
    if (!classId) return { ok: false, error: "Class is required" } as const;
    // Ensure class belongs to user
    const cls = await db
      .select({ id: tables.classes.id })
      .from(tables.classes)
      .where(and(eq(tables.classes.id as any, classId as any), eq(tables.classes.userId as any, userId as any)))
      .limit(1);
    if (!cls.length) return { ok: false, error: "Invalid class" } as const;
    // Try insert, on unique violation fall back to fetch existing
    try {
      await db.insert(tables.masterSubjects).values({ name, userId } as any);
    } catch {}
    revalidatePath("/dashboard/subjects");
    return { ok: true } as const;
  } catch (e: any) {
    const msg = e?.message ? String(e.message) : "Failed to create master subject";
    return { ok: false, error: msg } as const;
  }
}

// Create global master subject (for profile settings)
export async function createGlobalMasterSubject(formData: FormData) {
  try {
    const { id: userId } = await requireAuthUser();
    const name = String(formData.get("name") || "").trim();
    if (!name) return { ok: false, error: "Subject name is required" } as const;

    try {
      await db.insert(tables.masterSubjects).values({ name, userId } as any);
    } catch (error: any) {
      if (error?.code === '23505' || error?.message?.includes('duplicate') || error?.message?.includes('unique')) {
        return { ok: false, error: "A subject with this name already exists" } as const;
      }
      throw error;
    }

    revalidatePath("/dashboard/profile/settings");
    return { ok: true } as const;
  } catch (e: any) {
    const msg = e?.message ? String(e.message) : "Failed to create major subject";
    return { ok: false, error: msg } as const;
  }
}

export async function getSubjectsData(classId?: string) {
  const { id: userId } = await requireAuthUser();
  let classes: any[] = [];
  
  try {
    classes = await db
      .select()
      .from(tables.classes)
      .where(eq(tables.classes.userId as any, userId as any));
  } catch (error) {
    console.error("Database error when fetching classes:", error);
    // If database tables don't exist or connection fails, return empty data
    return {
      classes: [],
      subjects: [],
      masterSubjects: [],
    };
  }
  let subjects: any[] = [];
  let masterSubjects: any[] = [];
  try {
    subjects = classId
      ? ((await db
          .select()
          .from(tables.subjects)
          .where(and(eq(tables.subjects.classId, classId as any), eq(tables.subjects.userId as any, userId as any)))) as any[])
      : ((await db
          .select()
          .from(tables.subjects)
          .where(eq(tables.subjects.userId as any, userId as any))) as any[]);
  } catch (e) {
    // Likely schema mismatch (e.g., new columns not migrated yet). Return empty list to avoid runtime crash.
    subjects = [];
  }
  try {
    masterSubjects = (await db
      .select()
      .from(tables.masterSubjects)
      .where(eq(tables.masterSubjects.userId as any, userId as any))) as any[];
  } catch (e) {
    console.error("Database error when fetching master subjects:", e);
    masterSubjects = [];
  }
  return {
    classes,
    subjects,
    masterSubjects,
  };
}

export async function updateSubjectAction(formData: FormData) {
  const { id: userId } = await requireAuthUser();
  const id = String(formData.get("id") || "").trim();
  const name = String(formData.get("name") || "").trim();
  const classId = String(formData.get("classId") || "").trim();
  if (!id || !name) throw new Error("Missing required fields");
  await db
    .update(tables.subjects)
    .set({ name })
    .where(and(eq(tables.subjects.id, id as any), eq(tables.subjects.userId as any, userId as any)));
  revalidatePath("/dashboard/subjects");
  if (classId) revalidatePath(`/dashboard/classes/${classId}`);
}

export async function updateMasterSubjectAction(formData: FormData) {
  try {
    const { id: userId } = await requireAuthUser();
    const id = String(formData.get("id") || "").trim();
    const name = String(formData.get("name") || "").trim();
    if (!id || !name) return { ok: false, error: "Missing fields" } as const;
    await db
      .update(tables.masterSubjects)
      .set({ name } as any)
      .where(and(eq(tables.masterSubjects.id as any, id as any), eq(tables.masterSubjects.userId as any, userId as any)));
    revalidatePath("/dashboard/profile/settings");
    revalidatePath("/dashboard/subjects");
    return { ok: true } as const;
  } catch (e: any) {
    const msg = e?.message ? String(e.message) : "Failed to update";
    return { ok: false, error: msg } as const;
  }
}

export async function deleteMasterSubjectAction(formData: FormData) {
  try {
    const { id: userId } = await requireAuthUser();
    const id = String(formData.get("id") || "").trim();
    if (!id) return { ok: false, error: "Missing id" } as const;

    // Check if master subject is in use
    const subjectsUsingMaster = await db
      .select({ id: tables.subjects.id })
      .from(tables.subjects)
      .where(and(
        eq(tables.subjects.masterSubjectId as any, id as any),
        eq(tables.subjects.userId as any, userId as any)
      ));

    if (subjectsUsingMaster.length > 0) {
      return { ok: false, error: `Cannot delete: Master subject is being used by ${subjectsUsingMaster.length} subject(s). Please reassign or delete those subjects first.` } as const;
    }

    await db
      .delete(tables.masterSubjects)
      .where(and(eq(tables.masterSubjects.id as any, id as any), eq(tables.masterSubjects.userId as any, userId as any)));

    revalidatePath("/dashboard/profile/settings");
    revalidatePath("/dashboard/subjects");
    return { ok: true } as const;
  } catch (e: any) {
    const msg = e?.message ? String(e.message) : "Failed to delete master subject";
    return { ok: false, error: msg } as const;
  }
}

export async function deleteSubjectAction(formData: FormData) {
  const { id: userId } = await requireAuthUser();
  const id = String(formData.get("id") || "").trim();
  const classId = String(formData.get("classId") || "").trim();
  if (!id) throw new Error("Missing id");
  // Delete dependent rows first to satisfy FK constraints
  await db.transaction(async (tx) => {
    // Collect subject part IDs
    const parts = (await tx
      .select({ id: tables.subjectParts.id })
      .from(tables.subjectParts)
      .where(eq(tables.subjectParts.subjectId as any, id as any))) as Array<{ id: string }>;
    const partIds = parts.map((p) => p.id);

    // Delete exam_subject_part_settings referencing those parts
    if (partIds.length) {
      await tx
        .delete(tables.examSubjectPartSettings)
        .where(inArray(tables.examSubjectPartSettings.subjectPartId as any, partIds as any));
    }

    // Delete marks of this subject
    await tx.delete(tables.marks).where(eq(tables.marks.subjectId as any, id as any));

    // Delete exam_subject_settings for this subject
    await tx.delete(tables.examSubjectSettings).where(eq(tables.examSubjectSettings.subjectId as any, id as any));

    // Delete subject parts
    await tx.delete(tables.subjectParts).where(eq(tables.subjectParts.subjectId as any, id as any));

    // Finally delete the subject (ownership enforced)
    await tx
      .delete(tables.subjects)
      .where(and(eq(tables.subjects.id as any, id as any), eq(tables.subjects.userId as any, userId as any)));
  });
  revalidatePath("/dashboard/subjects");
  if (classId) revalidatePath(`/dashboard/classes/${classId}`);
}
