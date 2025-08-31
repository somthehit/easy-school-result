import { and, eq, sql, inArray } from "drizzle-orm";
import { db, tables } from "@/db/client";
import { gradeForPercentage } from "@/utils/grading";
import { computeConverted, round2 } from "@/utils/marks";
import { randomUUID } from "node:crypto";

export type RecomputeOptions = {
  examId: string;
  teacherId: string;
};

export async function recomputeResultsForExam({ examId, teacherId }: RecomputeOptions) {
  // Load students of the exam's class + section
  const exam = (await db.select().from(tables.exams).where(eq(tables.exams.id, examId)).limit(1))[0];
  if (!exam) throw new Error("Exam not found");

  // Get all subjects for the class
  const subjects = await db.select().from(tables.subjects).where(eq(tables.subjects.classId, exam.classId));
  const subjectMap = Object.fromEntries(subjects.map((s) => [s.id, s]));

  // Load per-exam subject overrides
  const subjOverrides = await db
    .select()
    .from(tables.examSubjectSettings)
    .where(eq(tables.examSubjectSettings.examId, examId));
  const subjOverrideMap = new Map(subjOverrides.map((o: any) => [o.subjectId as string, o]));

  // Load subject parts and per-exam part settings
  const parts = await db
    .select()
    .from(tables.subjectParts)
    .where(inArray(tables.subjectParts.subjectId, subjects.map((s) => s.id)));
  const partsBySubject = new Map<string, any[]>();
  for (const p of parts as any[]) {
    const arr = partsBySubject.get(p.subjectId) ?? [];
    arr.push(p);
    partsBySubject.set(p.subjectId, arr);
  }
  const partSettings = await db
    .select()
    .from(tables.examSubjectPartSettings)
    .where(eq(tables.examSubjectPartSettings.examId, examId));
  const partSettingByPartId = new Map(partSettings.map((ps: any) => [ps.subjectPartId as string, ps]));

  // Get all marks for this exam (aggregate across all teachers)
  const marks = await db
    .select()
    .from(tables.marks)
    .where(and(eq(tables.marks.examId, examId)));

  // Recompute converted marks if needed
  for (const m of marks) {
    const subj = subjectMap[m.subjectId];
    if (!subj) continue;
    // Effective grading base: part setting > subject exam override > class subject default
    const ps = m.subjectPartId ? (partSettingByPartId.get(m.subjectPartId as any) as any | undefined) : undefined;
    const so = subjOverrideMap.get(m.subjectId as any) as any | undefined;
    const fullMark = ps?.fullMark ?? so?.fullMark ?? subj.fullMark;
    const hasConversion = Boolean(ps?.hasConversion ?? so?.hasConversion ?? subj.hasConversion);
    const convertToMark = (ps?.convertToMark ?? so?.convertToMark ?? subj.convertToMark) ?? null;
    const converted = computeConverted(Number(m.obtained), fullMark, hasConversion, convertToMark);
    if (round2(Number(m.converted)) !== converted) {
      await db
        .update(tables.marks)
        .set({ converted: converted })
        .where(eq(tables.marks.id, m.id));
    }
  }

  // Aggregate totals per student
  const totals = await db
    .select({
      studentId: tables.marks.studentId,
      total: sql<number>`sum(${tables.marks.converted})`,
    })
    .from(tables.marks)
    .where(and(eq(tables.marks.examId, examId)))
    .groupBy(tables.marks.studentId);

  // Determine full total to compute percentage
  // If a subject has per-exam part settings, sum their effective targets; otherwise use subject-level effective target
  let fullTotals = 0;
  for (const s of subjects as any[]) {
    const psForSubj = (partsBySubject.get(s.id) || []).filter((p) => partSettingByPartId.has(p.id));
    if (psForSubj.length > 0) {
      for (const p of psForSubj) {
        const setting = partSettingByPartId.get(p.id)! as any;
        const target = setting.hasConversion && setting.convertToMark ? Number(setting.convertToMark) : Number(setting.fullMark);
        fullTotals += target;
      }
    } else {
      const so = subjOverrideMap.get(s.id) as any | undefined;
      const hasConv = Boolean(so?.hasConversion ?? s.hasConversion);
      const convertTo = (so?.convertToMark ?? s.convertToMark) ?? null;
      const full = Number(so?.fullMark ?? s.fullMark);
      const target = hasConv && convertTo ? Number(convertTo) : full;
      fullTotals += target;
    }
  }

  // Load students for exam's class/section
  const students = await db
    .select()
    .from(tables.students)
    .where(and(eq(tables.students.classId, exam.classId)));

  // Build result rows with grade/division for ALL students in the class
  const totalsMap = new Map(totals.map((t) => [t.studentId, Number(t.total)]));
  const rows = students.map((stu) => {
    const totalVal = totalsMap.get(stu.id) ?? 0;
    const percentage = fullTotals > 0 ? round2((totalVal / fullTotals) * 100) : 0;
    const { grade, division } = gradeForPercentage(percentage);
    return {
      studentId: stu.id,
      examId,
      total: round2(totalVal),
      percentage,
      grade,
      division,
      createdByUserId: teacherId,
      fiscalYear: exam.year, // simple mapping
      term: exam.term,
      classId: exam.classId,
      section: (stu.section as string) ?? "",
      rank: 0, // placeholder; update next
    };
  });

  // Compute ranks within class+section by percentage desc
  rows.sort((a, b) => b.percentage - a.percentage);
  let currentRank = 1;
  let lastPct = -1;
  let sameCount = 0;
  for (const r of rows) {
    if (r.percentage !== lastPct) {
      currentRank += sameCount; // advance by ties
      sameCount = 1;
      r.rank = currentRank;
      lastPct = r.percentage;
    } else {
      r.rank = currentRank;
      sameCount++;
    }
  }

  // Upsert results for these students
  for (const r of rows) {
    const existing = await db
      .select({ id: tables.results.id })
      .from(tables.results)
      .where(and(eq(tables.results.studentId, r.studentId), eq(tables.results.examId, r.examId), eq(tables.results.createdByUserId, teacherId)))
      .limit(1);

    if (existing[0]) {
      await db.update(tables.results).set(r).where(eq(tables.results.id, existing[0].id));
    } else {
      await db.insert(tables.results).values(r as any);
    }
  }
}

export async function togglePublishResult(examId: string, teacherId: string, publish: boolean) {
  // Generate share tokens for rows that get published
  if (publish) {
    const rows = await db
      .select({ id: tables.results.id, shareToken: tables.results.shareToken })
      .from(tables.results)
      .where(and(eq(tables.results.examId, examId), eq(tables.results.createdByUserId, teacherId)));
    for (const row of rows) {
      if (!row.shareToken) {
        await db.update(tables.results).set({ shareToken: randomUUID() as any }).where(eq(tables.results.id, row.id));
      }
    }
  }
  await db
    .update(tables.results)
    .set({ isPublished: publish })
    .where(and(eq(tables.results.examId, examId), eq(tables.results.createdByUserId, teacherId)));
}

export async function getPublishedResultByToken(shareToken: string) {
  const res = await db
    .select()
    .from(tables.results)
    .where(and(eq(tables.results.shareToken, shareToken as any), eq(tables.results.isPublished, true)))
    .limit(1);
  return res[0];
}
