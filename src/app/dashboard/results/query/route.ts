import { NextResponse } from "next/server";
import { db, tables } from "@/db/client";
import { and, asc, desc, eq, inArray } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const examId = searchParams.get("examId") || "";
  const includeAll = (searchParams.get("all") || "").toLowerCase() === "1"; // when true, include all exams' marks for the class
  const sortBy = (searchParams.get("sortBy") || "rank") as
    | "name"
    | "rollNo"
    | "total"
    | "percentage"
    | "grade"
    | "rank";
  const dir = (searchParams.get("dir") || "asc").toLowerCase() === "desc" ? "desc" : "asc";

  // Include class name/section to support cascading filters on the client
  const exams = await db
    .select({
      id: tables.exams.id,
      name: tables.exams.name,
      term: tables.exams.term,
      year: tables.exams.year,
      classId: tables.exams.classId,
      className: tables.classes.name,
      classSection: tables.classes.section,
    })
    .from(tables.exams)
    .leftJoin(tables.classes, eq(tables.classes.id, tables.exams.classId))
    .orderBy(desc(tables.exams.createdAt));

  if (!examId) {
    return NextResponse.json({ exams, results: [], subjects: [] });
  }

  // Resolve subjects for the exam's class
  const examRow = (await db.select().from(tables.exams).where(eq(tables.exams.id, examId)).limit(1)) as any[];
  // If the exam is missing/invalid, return an empty, valid JSON payload to prevent client JSON parse errors
  if (examRow.length === 0) {
    return NextResponse.json({ exams, results: [], subjects: [], parts: [], marks: [], anyConversion: false, classExams: [], allMarks: [] });
  }
  const rawSubjects = examRow.length
    ? await db
        .select({
          id: tables.subjects.id,
          name: tables.subjects.name,
        })
        .from(tables.subjects)
        .where(eq(tables.subjects.classId, examRow[0].classId))
    : [];

  // Fetch class owner user profile for signatures and school details
  let userProfile: { name?: string | null; principalName?: string | null; schoolName?: string | null; schoolAddress?: string | null; schoolPhone?: string | null; schoolEmail?: string | null } = { name: null, principalName: null, schoolName: null, schoolAddress: null, schoolPhone: null, schoolEmail: null };
  try {
    const cls = await db
      .select({
        classId: tables.classes.id,
        userId: tables.classes.userId,
        userName: (tables.users as any).name,
        principalName: (tables.users as any).principalName,
        schoolName: (tables.users as any).schoolName,
        schoolAddress: (tables.users as any).schoolAddress,
        schoolPhone: (tables.users as any).schoolPhone,
        schoolEmail: (tables.users as any).schoolEmail,
      })
      .from(tables.classes)
      .leftJoin(tables.users, eq(tables.users.id, tables.classes.userId))
      .where(eq(tables.classes.id, (examRow[0] as any).classId))
      .limit(1);
    if (cls && cls[0]) {
      userProfile = { 
        name: (cls[0] as any).userName, 
        principalName: (cls[0] as any).principalName,
        schoolName: (cls[0] as any).schoolName,
        schoolAddress: (cls[0] as any).schoolAddress,
        schoolPhone: (cls[0] as any).schoolPhone,
        schoolEmail: (cls[0] as any).schoolEmail
      };
    }
  } catch {}

  // Apply per-exam overrides if available
  let subjects = rawSubjects as Array<{ id: string; name: string; hasConversionResolved?: boolean; convertToMarkResolved?: number | null }>;
  try {
    const overrides = await db
      .select({ subjectId: tables.examSubjectSettings.subjectId, hasConversion: tables.examSubjectSettings.hasConversion, convertToMark: tables.examSubjectSettings.convertToMark })
      .from(tables.examSubjectSettings)
      .where(eq(tables.examSubjectSettings.examId, examId));
    const omap = new Map(overrides.map((o: any) => [o.subjectId, o]));
    subjects = subjects.map((s: any) => {
      const o = omap.get(s.id);
      const hasConv = o ? Boolean(o.hasConversion) : false;
      const convTo = o && o.convertToMark != null ? Number(o.convertToMark) : null;
      return { ...s, hasConversionResolved: hasConv, convertToMarkResolved: hasConv ? convTo : null };
    });
  } catch {
    subjects = subjects.map((s: any) => ({ ...s, hasConversionResolved: false, convertToMarkResolved: null }));
  }

  // Determine if any subject uses conversion for conditional UI
  const anyConversion = subjects.some((s: any) => Boolean(s.hasConversionResolved));

  // Fetch subject parts for subjects in this class (to detect TH/PR etc.)
  const subjectIds = subjects.map((s: any) => s.id);
  const parts = subjectIds.length
    ? await db
        .select({ id: tables.subjectParts.id, subjectId: tables.subjectParts.subjectId, name: tables.subjectParts.name, partType: (tables.subjectParts as any).partType })
        .from(tables.subjectParts)
        .where(inArray(tables.subjectParts.subjectId, subjectIds as any))
    : [];

  // Fetch per-exam subject part settings (for TH/PR conversion targets per part)
  let partSettings: Array<{ subjectPartId: string; hasConversion: boolean; convertToMark: number | null; fullMark: number }> = [];
  try {
    partSettings = (await db
      .select({
        subjectPartId: tables.examSubjectPartSettings.subjectPartId,
        hasConversion: tables.examSubjectPartSettings.hasConversion,
        convertToMark: tables.examSubjectPartSettings.convertToMark,
        fullMark: tables.examSubjectPartSettings.fullMark,
      })
      .from(tables.examSubjectPartSettings)
      .where(eq(tables.examSubjectPartSettings.examId, examId))) as Array<{ subjectPartId: string; hasConversion: boolean; convertToMark: number | null; fullMark: number }>;
  } catch {}

  // Build base query to include ALL students of the exam's class.
  // Left join results so students without a result row still appear.
  const base = db
    .select({
      id: tables.results.id,
      studentId: tables.students.id,
      total: tables.results.total,
      percentage: tables.results.percentage,
      grade: tables.results.grade,
      rank: tables.results.rank,
      shareToken: tables.results.shareToken,
      name: tables.students.name,
      rollNo: tables.students.rollNo,
      studentCode: (tables.students as any).studentCode,
    })
    .from(tables.students)
    .leftJoin(
      tables.results,
      and(eq(tables.results.studentId, tables.students.id), eq(tables.results.examId, examId))
    )
    .where(eq(tables.students.classId, (examRow[0] as any).classId));

  // Apply ordering
  const orderExpr = (() => {
    switch (sortBy) {
      case "name":
        return dir === "desc" ? desc(tables.students.name) : asc(tables.students.name);
      case "rollNo":
        return dir === "desc" ? desc(tables.students.rollNo) : asc(tables.students.rollNo);
      case "total":
        return dir === "desc" ? desc(tables.results.total) : asc(tables.results.total);
      case "percentage":
        return dir === "desc" ? desc(tables.results.percentage) : asc(tables.results.percentage);
      case "grade":
        return dir === "desc" ? desc(tables.results.grade) : asc(tables.results.grade);
      case "rank":
      default:
        return dir === "desc" ? desc(tables.results.rank) : asc(tables.results.rank);
    }
  })();

  const results = await base.orderBy(orderExpr);

  // All marks for selected exam (for subject breakdown rendering)
  const marks = await db
    .select({
      examId: tables.marks.examId,
      studentId: tables.marks.studentId,
      subjectId: tables.marks.subjectId,
      subjectPartId: tables.marks.subjectPartId,
      obtained: tables.marks.obtained,
      converted: tables.marks.converted,
    })
    .from(tables.marks)
    .where(eq(tables.marks.examId, examId));

  // Optionally include all exams for the same class and their marks (for class-wide exports)
  let classExams: Array<{ id: string; name: string; term?: string | null; year?: number | null }> = [];
  let allMarks: Array<{ examId: string; studentId: string; subjectId: string; subjectPartId: string | null; obtained: number | null; converted: number | null }> = [];
  if (includeAll && examRow.length) {
    classExams = exams.filter((e: any) => e.classId === (examRow[0] as any).classId);
    const examIds = classExams.map((e) => e.id);
    if (examIds.length) {
      allMarks = await db
        .select({
          examId: tables.marks.examId,
          studentId: tables.marks.studentId,
          subjectId: tables.marks.subjectId,
          subjectPartId: tables.marks.subjectPartId,
          obtained: tables.marks.obtained,
          converted: tables.marks.converted,
        })
        .from(tables.marks)
        .where(inArray(tables.marks.examId, examIds as any));
    }
  }

  return NextResponse.json({ exams, results, subjects, parts, marks, anyConversion, classExams, allMarks, userProfile, partSettings });
}
