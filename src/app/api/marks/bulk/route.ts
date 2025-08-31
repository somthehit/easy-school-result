import { NextRequest, NextResponse } from "next/server";
import { db, tables } from "@/db/client";
import { cookies } from "next/headers";
import { and, eq, inArray, isNull } from "drizzle-orm";
import { recomputeResultsForExam } from "@/services/results";

function requireAuthUser() {
  const raw = (cookies() as any).get?.("auth_user")?.value as string | undefined;
  if (!raw) throw new Error("Unauthorized");
  try {
    const u = JSON.parse(raw) as { id: string; name: string; email: string };
    if (!u?.id) throw new Error("Unauthorized");
    return u;
  } catch {
    throw new Error("Unauthorized");
  }
}

export async function POST(req: NextRequest) {
  try {
    const { id: teacherId } = requireAuthUser();
    const body = await req.json();
    const { examId, subjectId, items } = body as {
      examId: string;
      subjectId: string;
      items: Array<{ studentId: string; subjectPartId?: string | null; obtained: number; converted?: number | null }>;
    };
    if (!examId || !subjectId || !Array.isArray(items)) {
      return NextResponse.json({ ok: false, error: "Invalid payload" }, { status: 400 });
    }
    // Prevent edits for published results for this exam
    const studentIds = Array.from(new Set((items as any[]).map((i) => i.studentId).filter(Boolean)));
    let publishedSet = new Set<string>();
    if (studentIds.length) {
      const publishedRows = await db
        .select({ studentId: tables.results.studentId })
        .from(tables.results)
        .where(and(eq(tables.results.examId, examId), inArray(tables.results.studentId, studentIds as any), eq(tables.results.isPublished, true)));
      publishedSet = new Set((publishedRows as any[]).map((r) => r.studentId));
    }

    const skipped: string[] = [];

    for (const it of items) {
      if (publishedSet.has(it.studentId)) {
        skipped.push(it.studentId);
        continue;
      }
      const obtained = Number(it.obtained ?? NaN);
      const converted = it.converted == null ? null : Number(it.converted);
      if (!it.studentId || !Number.isFinite(obtained)) continue;

      // Try update first
      const whereBase = and(
        eq(tables.marks.studentId, it.studentId),
        eq(tables.marks.subjectId, subjectId),
        eq(tables.marks.examId, examId),
        it.subjectPartId ? eq(tables.marks.subjectPartId, it.subjectPartId) : isNull(tables.marks.subjectPartId)
      );
      const updated = await db
        .update(tables.marks)
        .set({ obtained, converted: converted ?? obtained, updatedAt: new Date() as any })
        .where(whereBase)
        .returning({ id: tables.marks.id });

      if ((updated as any[]).length === 0) {
        // Insert
        await db.insert(tables.marks).values({
          studentId: it.studentId,
          subjectId,
          subjectPartId: it.subjectPartId ?? null,
          examId,
          obtained,
          converted: converted ?? obtained,
          createdByUserId: teacherId,
        });
      }
    }

    // After saving marks, recompute results for this exam so UI reflects latest totals/ranks
    await recomputeResultsForExam({ examId, teacherId });

    return NextResponse.json({ ok: true, skipped, recomputed: true });
  } catch (e: any) {
    const msg = e?.message || "Unexpected error";
    const code = msg === "Unauthorized" ? 401 : 500;
    return NextResponse.json({ ok: false, error: msg }, { status: code });
  }
}
