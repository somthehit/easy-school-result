import { NextRequest, NextResponse } from "next/server";
import { db, tables } from "@/db/client";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { examId, items } = body as { examId: string; items: Array<{ subjectId: string; fullMark: number; passMark: number; hasConversion?: boolean; convertToMark?: number | null }> };
    if (!examId || !Array.isArray(items)) {
      return NextResponse.json({ ok: false, error: "Invalid payload" }, { status: 400 });
    }

    for (const it of items) {
      const fullMark = Number(it.fullMark || 0);
      const passMark = Number(it.passMark || 0);
      const hasConversion = Boolean(it.hasConversion);
      const ctmRaw: unknown = (it as any).convertToMark;
      const ctmNum = ctmRaw == null || ctmRaw === "" ? null : Number(ctmRaw as any);
      const convertToMark = ctmNum != null && Number.isFinite(ctmNum) ? ctmNum : null;
      if (!it.subjectId || !Number.isFinite(fullMark) || !Number.isFinite(passMark)) continue;
      await db
        .insert(tables.examSubjectSettings)
        .values({ examId, subjectId: it.subjectId, fullMark, passMark, hasConversion, convertToMark })
        .onConflictDoUpdate({
          target: [tables.examSubjectSettings.examId, tables.examSubjectSettings.subjectId],
          set: { fullMark, passMark, hasConversion, convertToMark },
        });
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Unexpected error" }, { status: 500 });
  }
}
