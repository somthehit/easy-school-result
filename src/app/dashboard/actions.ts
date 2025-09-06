"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db, tables } from "@/db/client";
import { and, eq, desc, sql } from "drizzle-orm";
import { recomputeResultsForExam, togglePublishResult } from "@/services/results";
import { cookies } from "next/headers";

// Local guard for Next.js redirect errors without relying on internal imports
function isNextRedirectError(e: unknown): e is { digest: string } {
  return !!e && typeof e === "object" && typeof (e as any).digest === "string" && (e as any).digest.startsWith("NEXT_REDIRECT");
}

export async function requireAuthUser() {
  const store = await cookies();
  const raw = store.get?.("auth_user")?.value as string | undefined;
  if (!raw) throw new Error("Unauthorized");
  try {
    const u = JSON.parse(raw) as { id: string; name: string; email: string };
    if (!u?.id) throw new Error("Unauthorized");
    return u;
  } catch {
    throw new Error("Unauthorized");
  }
}

export async function updateExamAction(formData: FormData) {
  try {
    await requireAuthUser();
    const id = String(formData.get("id") || "").trim();
    const name = String(formData.get("name") || "").trim();
    const term = String(formData.get("term") || "").trim();
    const year = Number(formData.get("year") || 0);
    const classId = String(formData.get("classId") || "").trim();
    if (!id || !name || !term || !year) throw new Error("Missing required fields");
    await db.update(tables.exams).set({ name, term, year }).where(eq(tables.exams.id, id as any));
    revalidatePath("/dashboard/exams");
    if (classId) revalidatePath(`/dashboard/classes/${classId}`);
  } catch (e: any) {
    if (isNextRedirectError(e)) throw e;
    const id = String(formData.get("id") || "").trim();
    redirect(`/dashboard/exams?error=${encodeURIComponent(e?.message || 'Failed to update exam')}`);
  }
}

export async function deleteExamAction(formData: FormData) {
  try {
    await requireAuthUser();
    const id = String(formData.get("id") || "").trim();
    const classId = String(formData.get("classId") || "").trim();
    if (!id) throw new Error("Missing id");
    await db.delete(tables.exams).where(eq(tables.exams.id, id as any));
    revalidatePath("/dashboard/exams");
    if (classId) revalidatePath(`/dashboard/classes/${classId}`);
  } catch (e: any) {
    if (isNextRedirectError(e)) throw e;
    redirect(`/dashboard/exams?error=${encodeURIComponent(e?.message || 'Failed to delete exam')}`);
  }
}

export async function createExam(formData: FormData) {
  try {
    const { id: teacherId } = await requireAuthUser();
    const name = String(formData.get("name") || "").trim();
    const term = String(formData.get("term") || "").trim();
    const year = Number(formData.get("year") || 0);
    const classId = String(formData.get("classId") || "").trim();

    if (!name || !term || !year || !classId) {
      throw new Error("Missing required fields");
    }

    // Check for duplicate exam (same name, term, year, class for this teacher)
    const existingExam = await db
      .select({ id: tables.exams.id })
      .from(tables.exams)
      .where(
        and(
          eq(tables.exams.createdByUserId as any, teacherId as any),
          eq(tables.exams.classId, classId as any),
          eq(tables.exams.name, name),
          eq(tables.exams.term, term),
          eq(tables.exams.year, year)
        )
      )
      .limit(1);
    
    if (existingExam.length > 0) {
      throw new Error("Exam with same name, term, year, and class already exists");
    }

    await db.insert(tables.exams).values({ name, term, year, classId, createdByUserId: teacherId });
    revalidatePath("/dashboard/exams");
    redirect("/dashboard/exams?notice=created");
  } catch (e: any) {
    if (isNextRedirectError(e)) throw e;
    redirect(`/dashboard/exams?error=${encodeURIComponent(e?.message || 'Failed to create exam')}`);
  }
}

export async function recomputeExamAction(formData: FormData) {
  try {
    const { id: teacherId } = await requireAuthUser();
    const examId = String(formData.get("examId") || "");
    if (!examId) throw new Error("Missing exam");
    await recomputeResultsForExam({ examId, teacherId });
    revalidatePath("/dashboard/exams");
    redirect("/dashboard/exams?notice=recomputed");
  } catch (e: any) {
    if (isNextRedirectError(e)) throw e;
    redirect(`/dashboard/exams?error=${encodeURIComponent(e?.message || 'Failed to recompute results')}`);
  }
}

export async function togglePublishAction(formData: FormData) {
  try {
    const { id: teacherId } = await requireAuthUser();
    const examId = String(formData.get("examId") || "");
    const publish = String(formData.get("publish") || "false") === "true";
    if (!examId) throw new Error("Missing exam");
    await togglePublishResult(examId, teacherId, publish);
    revalidatePath("/dashboard/exams");
    redirect(`/dashboard/exams?notice=${publish ? "published" : "unpublished"}`);
  } catch (e: any) {
    if (isNextRedirectError(e)) throw e;
    redirect(`/dashboard/exams?error=${encodeURIComponent(e?.message || 'Failed to toggle publish state')}`);
  }
}

// Create or update a per-exam subject setting (full/pass marks and conversion)
export async function upsertExamSubjectSetting(formData: FormData) {
  try {
    await requireAuthUser();
    const examId = String(formData.get("examId") || "").trim();
    const subjectId = String(formData.get("subjectId") || "").trim();
    const fullMark = Number(formData.get("fullMark") || 0);
    const passMark = Number(formData.get("passMark") || 0);
    const hasConversionRaw = formData.get("hasConversion");
    const hasConversion = hasConversionRaw === "true" || hasConversionRaw === "on" || hasConversionRaw === "1";
    const convertToRaw = formData.get("convertToMark");
    const convertToMark = convertToRaw === null || String(convertToRaw) === "" ? null : Number(convertToRaw);

    if (!examId || !subjectId || !fullMark || !passMark) {
      throw new Error("Missing required fields");
    }

    await db
      .insert(tables.examSubjectSettings)
      .values({ examId, subjectId, fullMark, passMark, hasConversion, convertToMark })
      .onConflictDoUpdate({
        target: [tables.examSubjectSettings.examId, tables.examSubjectSettings.subjectId],
        set: {
          fullMark,
          passMark,
          hasConversion,
          convertToMark,
        },
      });
    revalidatePath(`/dashboard/exams/${examId}/settings`);
    redirect(`/dashboard/exams/${examId}/settings?saved=1`);
  } catch (e: any) {
    if (isNextRedirectError(e)) throw e;
    const examId = String(formData.get("examId") || "").trim();
    redirect(`/dashboard/exams/${encodeURIComponent(examId)}/settings?error=${encodeURIComponent(e?.message || 'Failed to save settings')}`);
  }
}

export async function getDashboardData() {
  try {
    const { id: userId } = await requireAuthUser();
    // classes
    const classes = await db
      .select()
      .from(tables.classes)
      .where(eq(tables.classes.userId as any, userId as any))
      .orderBy(desc(tables.classes.name));

    // exams with basic counts (created by this user)
    const exams = await db
      .select({
        id: tables.exams.id,
        name: tables.exams.name,
        term: tables.exams.term,
        year: tables.exams.year,
        classId: tables.exams.classId,
        createdByUserId: tables.exams.createdByUserId,
        createdAt: tables.exams.createdAt,
      })
      .from(tables.exams)
      .where(eq(tables.exams.createdByUserId as any, userId as any))
      .orderBy(desc(tables.exams.createdAt));

    // results grouped by exam
    const results = await db
      .select({ examId: tables.results.examId, count: sql<number>`count(*)` })
      .from(tables.results)
      .groupBy(tables.results.examId);

    const resultCountMap = new Map<string, number>();
    for (const r of results as any[]) {
      resultCountMap.set(r.examId, Number(r.count));
    }

    return { classes, exams: exams.map((e) => ({ ...e, resultCount: resultCountMap.get(e.id) || 0 })) };
  } catch (err: any) {
    console.error('[getDashboardData] DB error:', {
      message: err?.message,
      code: err?.code,
      detail: err?.detail,
      hint: err?.hint,
      table: 'exams',
    });
    // Return empty but valid structure to avoid crashing the dashboard
    return { classes: [], exams: [] };
  }
}
