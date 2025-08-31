import { db, tables } from "@/db/client";
import { updateStudentAction } from "../actions";
import { and, eq, inArray } from "drizzle-orm";
import React from "react";

// Type definitions
type Student = { id: string; classId: string; userId: string; name: string; rollNo?: string | number; studentCode?: string; email?: string; phone?: string; address?: string; dob?: string | Date; gender?: string; guardianName?: string; guardianPhone?: string; createdAt?: string | Date; updatedAt?: string | Date; photoUrl?: string; section?: string; contact?: string; parentName?: string; fathersName?: string; mothersName?: string };
type Class = { id: string; name: string; section?: string; createdAt?: string | Date; updatedAt?: string | Date };
type Exam = { id: string; name: string; classId: string; year: number; createdByUserId: string; createdAt?: string | Date; updatedAt?: string | Date; term?: string };
type Mark = { id: string; studentId: string; examId: string; subjectId: string; obtained: number; converted: number; subjectPartId?: string; createdAt?: string | Date; updatedAt?: string | Date };
type Result = { id: string; studentId: string; examId: string; total: number; percentage: number; grade: string; rank: number; shareToken?: string; createdAt?: string | Date; updatedAt?: string | Date };
import StudentResultExportClient from "@/components/StudentResultExportClient";
import StudentIdCardClient from "@/components/StudentIdCardClient";
import StudentCertificateClient from "@/components/StudentCertificateClient";
import { requireAuthUser } from "../../actions";

export const dynamic = "force-dynamic";

export default async function StudentDetailPage({ params, searchParams }: { params: Promise<{ id: string }>, searchParams: Promise<{ examId?: string; mode?: string; year?: string; saved?: string; edit?: string; error?: string }> }) {
  const pr = await params;
  const sp = await searchParams;
  const id = pr.id;
  const { id: userId } = await requireAuthUser();
  const examId = sp?.examId || "";
  const selectedYearParam = sp?.year as string | undefined;
  const mode = (sp?.mode as string) === "final" ? "final" : "single";

  const studentRows = await db
    .select()
    .from(tables.students)
    .where(and(eq(tables.students.id, id), eq(tables.students.userId, userId)))
    .limit(1);
  if (!studentRows.length) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-semibold">Student not found</h1>
        <p className="text-sm text-neutral-500 mt-2">The requested student does not exist or you don't have access.</p>
      </div>
    );
  }
  const student = studentRows[0] as Student;

  // Class row for display and export title
  const classRows = await db.select().from(tables.classes).where(eq(tables.classes.id, student.classId)).limit(1);
  const cls = classRows[0] as Class | undefined;
  const classDisplay = cls ? `${cls.name}${cls.section ? ` — ${cls.section}` : ''}` : undefined;

  // Exams available for the student's class (only exams created by this user)
  const exams = await db
    .select()
    .from(tables.exams)
    .where(and(eq(tables.exams.classId, student.classId), eq(tables.exams.createdByUserId, userId)));
  const years = Array.from(new Set((exams as Exam[]).map((e) => e.year))).sort((a, b) => a - b);
  const defaultYear = selectedYearParam ? Number(selectedYearParam) : ((exams as Exam[]).length ? (exams as Exam[])[(exams as Exam[]).length - 1].year : undefined);
  const selectedYear = defaultYear;

  // Data for Final mode: exams in selected year, marks and overrides for the student across those exams
  const yearExams = selectedYear != null ? (exams as Exam[])
    .filter((e) => e.year === selectedYear)
    .sort((a, b) => new Date(String(a.createdAt || 0)).getTime() - new Date(String(b.createdAt || 0)).getTime()) : [];
  const yearExamIds = yearExams.map((e) => e.id);
  const yearMarks = yearExamIds.length
    ? await db
        .select({ examId: tables.marks.examId, subjectId: tables.marks.subjectId, subjectPartId: tables.marks.subjectPartId, obtained: tables.marks.obtained, converted: tables.marks.converted })
        .from(tables.marks)
        .where(and(eq(tables.marks.studentId, id), inArray(tables.marks.examId, yearExamIds)))
    : [];
  const yearOverrides = yearExamIds.length
    ? await db
        .select({ examId: tables.examSubjectSettings.examId, subjectId: tables.examSubjectSettings.subjectId, hasConversion: tables.examSubjectSettings.hasConversion, convertToMark: tables.examSubjectSettings.convertToMark })
        .from(tables.examSubjectSettings)
        .where(inArray(tables.examSubjectSettings.examId, yearExamIds))
    : [];
  const marksByExam: Record<string, Record<string, { obtained: number; converted: number }>> = {};
  for (const m of yearMarks) {
    if (!marksByExam[m.examId]) marksByExam[m.examId] = {};
    const prev = marksByExam[m.examId][m.subjectId] || { obtained: 0, converted: 0 };
    marksByExam[m.examId][m.subjectId] = {
      obtained: prev.obtained + (Number(m.obtained) || 0),
      converted: prev.converted + (Number(m.converted) || 0),
    };
  }

  const overridesByExam: Record<string, Record<string, { examId: string; subjectId: string; hasConversion: boolean; convertToMark: number | null }>> = {};
  for (const o of yearOverrides) {
    if (!overridesByExam[o.examId]) overridesByExam[o.examId] = {};
    overridesByExam[o.examId][o.subjectId] = o;
  }
  const totalsByExam: Record<string, { obt: number; conv: number }> = {};
  for (const m of yearMarks) {
    if (!totalsByExam[m.examId]) totalsByExam[m.examId] = { obt: 0, conv: 0 };
    totalsByExam[m.examId].obt += Number(m.obtained) || 0;
    totalsByExam[m.examId].conv += Number(m.converted) || 0;
  }

  // Subjects of student's class
  const subjects = await db.select().from(tables.subjects).where(eq(tables.subjects.classId, student.classId));
  // Subject parts for the class (e.g., TH/PR)
  const subjectParts = (subjects as { id: string; name: string }[]).length
    ? await db
        .select({ id: tables.subjectParts.id, subjectId: tables.subjectParts.subjectId, name: tables.subjectParts.name, partType: tables.subjectParts.partType })
        .from(tables.subjectParts)
        .where(inArray(tables.subjectParts.subjectId, (subjects as { id: string; name: string }[]).map((s) => s.id)))
    : [] as Array<{ id: string; subjectId: string; name: string; partType?: string }>;

  // Per-exam subject part settings for the selected exam (if any) to compute effective targets per part
  let partSettings: Array<{ subjectPartId: string; hasConversion: boolean; convertToMark: number | null; fullMark: number }> = [];
  let partSettingById: Map<string, { subjectPartId: string; hasConversion: boolean; convertToMark: number | null; fullMark: number }> = new Map();
  if (examId) {
    try {
      partSettings = (await db
        .select({
          subjectPartId: tables.examSubjectPartSettings.subjectPartId,
          hasConversion: tables.examSubjectPartSettings.hasConversion,
          convertToMark: tables.examSubjectPartSettings.convertToMark,
          fullMark: tables.examSubjectPartSettings.fullMark,
        })
        .from(tables.examSubjectPartSettings)
        .where(eq(tables.examSubjectPartSettings.examId, examId))
      ) as Array<{ subjectPartId: string; hasConversion: boolean; convertToMark: number | null; fullMark: number }>;
    } catch {
      partSettings = [];
    }
    partSettingById = new Map(partSettings.map((ps) => [ps.subjectPartId, ps]));
  }

  // Detect conversion presence for Final view based on actual stored converted marks
  const anyConvFinal = (yearMarks as any[]).some((m: any) => Number(m.converted) !== Number(m.obtained));

  // Exam subject overrides if an exam is selected (handle missing table gracefully)
  let overrides: any[] = [];
  if (examId) {
    try {
      overrides = (await db
        .select()
        .from(tables.examSubjectSettings)
        .where(eq(tables.examSubjectSettings.examId, examId))) as any[];
    } catch {
      overrides = [];
    }
  }
  const overrideBySubject: Record<string, any> = {};
  for (const o of overrides as any[]) overrideBySubject[o.subjectId] = o;

  // Marks for selected exam (if any)
  const marks = examId
    ? await db
        .select()
        .from(tables.marks)
        .where(and(eq(tables.marks.studentId, id), eq(tables.marks.examId, examId)))
    : [];

  const markBySubject: Record<string, { obtained: number; converted: number }> = {};
  for (const m of marks as any[]) {
    const prev = markBySubject[m.subjectId] || { obtained: 0, converted: 0 };
    markBySubject[m.subjectId] = {
      obtained: prev.obtained + (Number((m as any).obtained) || 0),
      converted: prev.converted + (Number((m as any).converted) || 0),
    };
  }

  // Precompute single exam totals for export convenience
  const singleTotals = (() => {
    if (!examId) return { totalObt: 0, totalConv: 0 };
    const totalObt = (subjects as any[]).reduce((acc, s: any) => {
      const m = markBySubject[s.id];
      return acc + (m ? Number(m.obtained) : 0);
    }, 0);
    const totalConv = (subjects as any[]).reduce((acc, s: any) => {
      const m = markBySubject[s.id];
      return acc + (m ? Number(m.converted) : 0);
    }, 0);
    return { totalObt, totalConv };
  })();

  // Detect conversion presence for Single view based on actual stored converted marks
  const anyConvSingle = (marks as any[]).some((m: any) => Number((m as any).converted) !== Number((m as any).obtained));

  const activeExam = examId ? (exams as any[]).find((e: any) => e.id === examId) : null;
  // Fallback: most recent exam for this class (by createdAt)
  const fallbackExam = (exams as any[]).length
    ? (exams as any[]).slice().sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())[(exams as any[]).length - 1]
    : null;

  // Get school details from user profile instead of class settings
  let userProfile: any = null;
  try {
    const up = await db.select().from(tables.users).where(eq(tables.users.id, userId)).limit(1);
    userProfile = up[0] || null;
  } catch {
    userProfile = null;
  }

  // Fallback to teacher's profile school details if class settings are empty
  // Prefer the creator of the active exam (single mode) or the latest exam in the class
  let teacher: any = null;
  try {
    const srcExam = activeExam || ((exams as any[]).length ? (exams as any[])[(exams as any[]).length - 1] : null);
    if (srcExam) {
      const rows = await db.select().from(tables.users).where(eq(tables.users.id, (srcExam as any).createdByUserId)).limit(1);
      teacher = rows[0] || null;
    }
  } catch {}

  const mergedDefaults = {
    schoolName: ((userProfile?.schoolName ?? "").trim()) || (teacher?.schoolName ?? ""),
    schoolAddress: ((userProfile?.schoolAddress ?? "").trim()) || (teacher?.schoolAddress ?? ""),
    estb: (userProfile?.estb ?? null),
    preparedBy: ((userProfile?.principalName ?? "").trim()) || (teacher?.name ?? null),
    checkedBy: (userProfile?.principalName ?? null),
    approvedBy: (userProfile?.principalName ?? null),
    parentSignatureLabel: ("Parent/Guardian Signature"),
    // Defaults for certificate signer block
    signerName: (userProfile?.principalName ?? teacher?.name ?? null),
    signerTitle: (userProfile?.principalName ? "Principal" : "Teacher"),
  } as const;

  // Result summary for selected exam (percentage, grade/division, rank)
  const resultRows = examId
    ? await db
        .select()
        .from(tables.results)
        .where(and(eq(tables.results.studentId, id), eq(tables.results.examId, examId)))
        .limit(1)
    : [];
  const result = (resultRows as any[])[0] || null;

  // Year-scoped class enrollment (roll/section) for exam year and selected final year
  const examYear = examId ? (exams as any[]).find((e: any) => e.id === examId)?.year : undefined;
  const yearsToFetch = Array.from(new Set([examYear, selectedYear].filter((y): y is number => typeof y === "number")));
  let enrollments: Array<{ year: number; rollNo: number; section: string }> = [];
  if (yearsToFetch.length) {
    try {
      const rows = (await db
        .select({
          year: tables.classEnrollments.year,
          rollNo: tables.classEnrollments.rollNo,
          section: tables.classEnrollments.section,
        })
        .from(tables.classEnrollments)
        .where(and(
          eq(tables.classEnrollments.studentId, id),
          eq(tables.classEnrollments.classId, student.classId),
          inArray(tables.classEnrollments.year, yearsToFetch as any)
        ))
      ) as Array<{ year: number; rollNo: number; section: string }>;
      enrollments = rows;
    } catch {
      enrollments = [];
    }
  }
  const enrollmentByYear = new Map(enrollments.map((e) => [e.year, e]));
  const singleEnroll = examYear != null ? enrollmentByYear.get(examYear) : undefined;
  const finalEnroll = selectedYear != null ? enrollmentByYear.get(selectedYear) : undefined;

  // Final aggregation by selected year across class: sum totals, average percentages, compute rank
  let myFinalTotal: number | null = null;
  let myFinalAvgPercent: number | null = null;
  let myFinalRank: number | null = null;
  if (selectedYear != null) {
    const classYearRows = (await db
      .select({
        studentId: tables.results.studentId,
        total: tables.results.total,
        percentage: tables.results.percentage,
      })
      .from(tables.results)
      .innerJoin(tables.exams, eq(tables.results.examId, tables.exams.id))
      .where(and(eq(tables.exams.year, selectedYear), eq(tables.results.classId, student.classId)))
    ) as Array<{ studentId: string; total: number; percentage: number }>;

    const agg: Record<string, { sum: number; percSum: number; count: number }> = {};
    for (const r of classYearRows) {
      if (!agg[r.studentId]) agg[r.studentId] = { sum: 0, percSum: 0, count: 0 };
      agg[r.studentId].sum += Number(r.total) || 0;
      agg[r.studentId].percSum += Number(r.percentage) || 0;
      agg[r.studentId].count += 1;
    }
    const ranking = Object.entries(agg)
      .map(([sid, a]) => ({ sid, sum: a.sum, avgPerc: a.count ? a.percSum / a.count : 0 }))
      .sort((a, b) => b.sum - a.sum);
    const meIdx = ranking.findIndex((r) => r.sid === id);
    if (meIdx >= 0) {
      myFinalTotal = ranking[meIdx].sum;
      myFinalAvgPercent = ranking[meIdx].avgPerc;
      myFinalRank = meIdx + 1;
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Header Section */}
        <section className="mb-10">
          <div className="flex items-center gap-4 mb-6">
            <a 
              href="/dashboard/students" 
              className="inline-flex items-center gap-2 px-4 py-2 bg-white hover:bg-gray-50 border border-gray-200 rounded-xl font-medium transition-colors shadow-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to Students
            </a>
            <a 
              href={`/dashboard/classes/${student.classId}`} 
              className="inline-flex items-center gap-2 px-4 py-2 bg-white hover:bg-gray-50 border border-gray-200 rounded-xl font-medium transition-colors shadow-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              View Class
            </a>
          </div>
          
          <div className="flex items-center gap-6">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                {student.name}
              </h1>
              <p className="text-xl text-gray-600 mt-1">Student Profile & Academic Records</p>
            </div>
            <div className="ml-auto">
              {sp?.edit === '1' ? (
                <a 
                  href={`/dashboard/students/${student.id}`} 
                  className="inline-flex items-center gap-2 px-6 py-3 bg-gray-500 hover:bg-gray-600 text-white rounded-xl font-medium transition-colors shadow-lg"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Cancel
                </a>
              ) : (
                <a 
                  href={`/dashboard/students/${student.id}?edit=1`} 
                  className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-medium transition-colors shadow-lg"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Edit
                </a>
              )}
            </div>
          </div>
        </section>

        {/* Status Messages */}
        {(sp?.error || sp?.saved === '1') && (
          <section className="mb-8 space-y-4">
            {sp?.error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-red-100 rounded-full flex items-center justify-center">
                    <svg className="w-3 h-3 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <p className="text-red-800 text-sm">{decodeURIComponent(sp.error)}</p>
                </div>
              </div>
            )}
            {sp?.saved === '1' && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <p className="text-green-800 font-medium">Student information updated successfully!</p>
                </div>
              </div>
            )}
          </section>
        )}

        {/* Student Details Card */}
        <section className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
          <div className="bg-gradient-to-r from-blue-500 to-purple-600 px-8 py-6">
            <h2 className="text-xl font-bold text-white flex items-center gap-3">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              Student Details
            </h2>
          </div>
          <div className="p-8">
            {/* Photo and Basic Info */}
            <div className="flex flex-col lg:flex-row gap-8 mb-8">
              {student.photoUrl && (
                <div className="flex-shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img 
                    src={student.photoUrl} 
                    alt={`${student.name} photo`} 
                    className="w-32 h-32 object-cover rounded-2xl shadow-lg border-4 border-white"
                  />
                </div>
              )}
              
              <div className="flex-1">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {(() => {
                    const det = mode === "single" ? singleEnroll : finalEnroll;
                    return (
                      <>
                        <div className="bg-gray-50 rounded-xl p-4">
                          <div className="text-sm font-medium text-gray-500 mb-1">Roll Number</div>
                          <div className="text-lg font-semibold text-gray-900">{det?.rollNo ?? student.rollNo}</div>
                        </div>
                        <div className="bg-gray-50 rounded-xl p-4">
                          <div className="text-sm font-medium text-gray-500 mb-1">Student ID</div>
                          <div className="text-lg font-semibold text-gray-900">{student.studentCode ?? '-'}</div>
                        </div>
                        <div className="bg-gray-50 rounded-xl p-4">
                          <div className="text-sm font-medium text-gray-500 mb-1">Section</div>
                          <div className="text-lg font-semibold text-gray-900">
                            {(det?.section && String(det.section).trim() !== "") ? det.section : ((student.section && String(student.section).trim() !== "") ? student.section : "Not assigned")}
                          </div>
                        </div>
                      </>
                    );
                  })()}
                  
                  <div className="bg-gray-50 rounded-xl p-4">
                    <div className="text-sm font-medium text-gray-500 mb-1">Date of Birth</div>
                    <div className="text-lg font-semibold text-gray-900">
                      {student.dob ? new Date(student.dob as any).toLocaleDateString() : '-'}
                    </div>
                  </div>
                  
                  <div className="bg-gray-50 rounded-xl p-4">
                    <div className="text-sm font-medium text-gray-500 mb-1">Contact</div>
                    <div className="text-lg font-semibold text-gray-900">{student.contact || '-'}</div>
                  </div>
                  
                  <div className="bg-gray-50 rounded-xl p-4">
                    <div className="text-sm font-medium text-gray-500 mb-1">Class</div>
                    <div className="text-lg font-semibold text-gray-900">{classDisplay || '-'}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Family Information */}
            <div className="border-t border-gray-200 pt-8">
              <h3 className="text-xl font-semibold text-gray-900 mb-6 flex items-center gap-2">
                <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                Family Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="bg-gray-50 rounded-xl p-4">
                  <div className="text-sm font-medium text-gray-500 mb-1">Parent/Guardian</div>
                  <div className="text-lg font-semibold text-gray-900">{student.parentName || '-'}</div>
                </div>
                <div className="bg-gray-50 rounded-xl p-4">
                  <div className="text-sm font-medium text-gray-500 mb-1">Father's Name</div>
                  <div className="text-lg font-semibold text-gray-900">{student.fathersName || '-'}</div>
                </div>
                <div className="bg-gray-50 rounded-xl p-4">
                  <div className="text-sm font-medium text-gray-500 mb-1">Mother's Name</div>
                  <div className="text-lg font-semibold text-gray-900">{student.mothersName || '-'}</div>
                </div>
              </div>
              {student.address && (
                <div className="mt-6">
                  <div className="bg-gray-50 rounded-xl p-4">
                    <div className="text-sm font-medium text-gray-500 mb-1">Address</div>
                    <div className="text-lg font-semibold text-gray-900">{student.address}</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Export Controls */}
        <section className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
          <div className="bg-gradient-to-r from-emerald-500 to-teal-600 px-8 py-6">
            <h2 className="text-xl font-bold text-white flex items-center gap-3">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Export Documents
            </h2>
          </div>
          <div className="p-8 space-y-6">
            {/* ID Card Controls */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-100">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V4a2 2 0 114 0v2m-4 0a2 2 0 104 0m-4 0H9m4 0h1m-5 8l2 2 4-4" />
                </svg>
                Student ID Card
              </h3>
              <StudentIdCardClient
                student={{
                  name: student.name,
                  studentCode: student.studentCode ?? null,
                  className: classDisplay ?? null,
                  parentName: student.parentName ?? null,
                  address: student.address ?? null,
                  contact: student.contact ?? null,
                  photoUrl: student.photoUrl ?? null,
                  validText: selectedYear != null ? `Year ${selectedYear}` : null,
                }}
                school={{
                  name: mergedDefaults.schoolName,
                  address: mergedDefaults.schoolAddress,
                  estb: mergedDefaults.estb as any,
                  logoUrl: null,
                }}
              />
            </div>

            {/* Certificate Controls */}
            <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-6 border border-purple-100">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                </svg>
                Certificate of Appreciation
              </h3>
              <StudentCertificateClient
                data={{
                  schoolLogoUrl: null,
                  schoolName: mergedDefaults.schoolName,
                  studentName: student.name,
                  parentName: student.parentName ?? student.fathersName ?? student.mothersName ?? null,
                  gender: (student as any).gender ?? null,
                  dob: student.dob ?? null,
                  className: classDisplay ?? null,
                  title: "CERTIFICATE",
                  subtitle: "OF APPRECIATION",
                  presentedPrefix: "THIS CERTIFICATE IS PRESENTED TO",
                  joiningDate: null,
                  dateText: selectedYear ? `Issued in ${selectedYear}` : undefined,
                  signerName: mergedDefaults.signerName || "",
                  signerTitle: mergedDefaults.signerTitle || "",
                }}
              />
            </div>

            {/* Result Export Controls */}
            {mode === "single" ? (
              examId ? (
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-6 border border-green-100">
                  <h3 className="text-lg font-semibold text-gray-909 mb-4 flex items-center gap-2">
                    <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    Exam Result Export
                  </h3>
                  <StudentResultExportClient
                    student={{
                      name: student.name,
                      className: classDisplay,
                      rollNo: typeof (singleEnroll?.rollNo ?? student.rollNo) === 'string' ? Number(singleEnroll?.rollNo ?? student.rollNo) || null : Number(singleEnroll?.rollNo ?? student.rollNo) || null,
                      section: singleEnroll?.section ?? student.section,
                      dob: student.dob,
                      contact: student.contact,
                      parentName: student.parentName,
                      address: student.address,
                    }}
                    mode="single"
                    exam={activeExam ? { id: activeExam.id, name: activeExam.name, year: activeExam.year } : null}
                    subjects={(subjects as any[]).map((s: any) => {
                      const override = overrides.find((o: any) => o.subjectId === s.id);
                      return { 
                        id: s.id, 
                        name: s.name, 
                        convertTo: override?.convertToMark || 30 
                      };
                    })}
                    single={{
                      rows: (subjects as any[]).map((s: any) => ({
                        subjectName: s.name,
                        obtained: markBySubject[s.id] ? Number(markBySubject[s.id].obtained) : null,
                        converted: markBySubject[s.id] ? Number(markBySubject[s.id].converted) : null,
                      })),
                      totals: { totalObt: singleTotals.totalObt, totalConv: singleTotals.totalConv },
                      summary: result
                        ? { percentage: Number(result.percentage), rank: result.rank ?? null, division: result.grade ?? null }
                        : undefined,
                    }}
                    parts={subjectParts}
                    yearMarks={(marks as any[]).map((m: any) => ({ examId: m.examId, subjectId: m.subjectId, subjectPartId: m.subjectPartId ?? null, obtained: m.obtained ?? null, converted: m.converted ?? null }))}
                    defaults={mergedDefaults}
                    anyConvSingle={anyConvSingle}
                  />
                </div>
              ) : null
            ) : (
              selectedYear ? (
                <div className="bg-gradient-to-r from-orange-50 to-yellow-50 rounded-xl p-6 border border-orange-100">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    Final Result Export
                  </h3>
                  <StudentResultExportClient
                    student={{
                      name: student.name,
                      className: classDisplay,
                      rollNo: typeof (finalEnroll?.rollNo ?? student.rollNo) === 'string' ? Number(finalEnroll?.rollNo ?? student.rollNo) || null : Number(finalEnroll?.rollNo ?? student.rollNo) || null,
                      section: finalEnroll?.section ?? student.section,
                      dob: student.dob,
                      contact: student.contact,
                      parentName: student.parentName,
                      address: student.address,
                    }}
                    mode="final"
                    year={selectedYear}
                    subjects={(subjects as any[]).map((s: any) => ({ id: s.id, name: s.name }))}
                    finalData={{
                      exams: yearExams.map((e: any) => ({ id: e.id, name: e.name })),
                      marksByExam: marksByExam as any,
                      totalsByExam: totalsByExam as any,
                      summary: {
                        finalTotal: myFinalTotal ?? null,
                        finalAvgPercent: myFinalAvgPercent ?? null,
                        finalRank: myFinalRank ?? null,
                        finalDivision: null,
                      },
                    }}
                    parts={subjectParts}
                    yearMarks={yearMarks as any}
                    defaults={mergedDefaults}
                    anyConvFinal={anyConvFinal}
                  />
                </div>
              ) : null
            )}
          </div>
        </section>

        {/* Edit Form */}
        {sp?.edit === '1' && (
          <section className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
            <div className="bg-gradient-to-r from-indigo-500 to-purple-600 px-8 py-6">
              <h2 className="text-xl font-bold text-white flex items-center gap-3">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Edit Student Information
              </h2>
            </div>
            <div className="p-8">
              <form action={updateStudentAction} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <input type="hidden" name="id" value={student.id} />
                <input type="hidden" name="classId" value={student.classId} />
                <input name="name" required defaultValue={student.name} placeholder="Full name" className="rounded-md border px-3 py-2 bg-transparent" />
                <input name="rollNo" type="number" min={1} defaultValue={singleEnroll?.rollNo ?? student.rollNo} placeholder="Roll No" className="rounded-md border px-3 py-2 bg-transparent" />
                <input name="section" defaultValue={singleEnroll?.section ?? student.section} placeholder="Section" className="rounded-md border px-3 py-2 bg-transparent" />
                <select name="gender" defaultValue={(student as any).gender ?? ''} className="rounded-md border px-3 py-2 bg-transparent">
                  <option value="">Select gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                </select>
                <input name="dob" type="date" defaultValue={student.dob ? new Date(student.dob as any).toISOString().split('T')[0] : ''} className="rounded-md border px-3 py-2 bg-transparent" />
                <input name="contact" defaultValue={student.contact ?? ''} placeholder="Contact" className="rounded-md border px-3 py-2 bg-transparent" />
                <input name="parentName" defaultValue={student.parentName ?? ''} placeholder="Parent/Guardian" className="rounded-md border px-3 py-2 bg-transparent" />
                <input name="fathersName" defaultValue={student.fathersName ?? ''} placeholder="Father's Name" className="rounded-md border px-3 py-2 bg-transparent" />
                <input name="mothersName" defaultValue={student.mothersName ?? ''} placeholder="Mother's Name" className="rounded-md border px-3 py-2 bg-transparent" />
                <div className="sm:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
                  <input name="photoUrl" defaultValue={student.photoUrl ?? ''} placeholder="Photo URL" className="rounded-md border px-3 py-2 bg-transparent" />
                  <input type="file" name="photoFile" accept="image/*" className="block w-full text-sm" />
                </div>
                <div className="lg:col-span-3">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Address</label>
                  <input name="address" defaultValue={student.address ?? ''} placeholder="Address" className="w-full rounded-xl border border-gray-300 px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                </div>
                <div className="lg:col-span-3 flex items-end">
                  <button type="submit" className="w-full px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-medium hover:from-emerald-600 hover:to-teal-700 transition-all duration-200 shadow-lg">
                    Update Student Information
                  </button>
                </div>
              </form>
            </div>
          </section>
        )}

        {/* Subjects-wise Marks */}
        <section className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
          <div className="bg-gradient-to-r from-amber-500 to-orange-600 px-8 py-6">
            <h2 className="text-2xl font-bold text-white flex items-center gap-3">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              Academic Performance
            </h2>
          </div>
          <div className="p-6">
            {/* Header Section */}
            <div className="bg-gradient-to-r from-red-50 to-pink-50 border-l-4 border-red-400 rounded-lg p-6 mb-6">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-gray-900 mb-1">Subject Performance Overview</h3>
                  <p className="text-sm text-gray-600">Track academic progress across all subjects and exams</p>
                </div>
                
                <div className="flex items-center gap-3">
                  {(activeExam || fallbackExam) ? (
                    <a
                      href={`/dashboard/exams/${(activeExam || fallbackExam).id}/marks?view=student&studentId=${encodeURIComponent(student.id)}&focusStudentId=${encodeURIComponent(student.id)}`}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-medium transition-colors text-sm"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      Add Marks
                    </a>
                  ) : (
                    <button
                      type="button"
                      disabled
                      title="Create an exam first to enter marks"
                      className="inline-flex items-center gap-2 px-4 py-2 bg-gray-400 text-white rounded-lg font-medium cursor-not-allowed opacity-60 text-sm"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      Add Marks
                    </button>
                  )}
                </div>
              </div>
            </div>
            
            {/* Filters Section */}
            <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6">
              <form method="get" className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">View Mode:</label>
                  <select name="mode" defaultValue={mode} className="w-full rounded-lg border border-gray-300 px-3 py-2 bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm">
                    <option value="single">Single Exam</option>
                    <option value="final">Final Result</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Exam:</label>
                  <select name="examId" defaultValue={examId} className="w-full rounded-lg border border-gray-300 px-3 py-2 bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm">
                    <option value="">Select Exam</option>
                    {(exams as any[]).map((e) => (
                      <option key={e.id} value={e.id}>{e.name} — {e.term} {e.year}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Year:</label>
                  <select name="year" defaultValue={selectedYear ?? ""} className="w-full rounded-lg border border-gray-300 px-3 py-2 bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm">
                    <option value="">Select Year</option>
                    {years.map((y) => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <button type="submit" className="w-full px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-600 text-white font-medium transition-colors text-sm">
                    Apply Filters
                  </button>
                </div>
              </form>
            </div>

            {/* Marks Display */}
            {mode === "single" ? (
              !examId ? (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 text-center">
                  <svg className="w-12 h-12 text-blue-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p className="text-blue-700 font-medium">Select an exam to view the individual result breakdown</p>
                </div>
              ) : subjects.length === 0 ? (
                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 text-center">
                  <svg className="w-12 h-12 text-yellow-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                  <p className="text-yellow-700 font-medium">No subjects found in this class</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Student Info Summary */}
                  <div className="bg-gradient-to-r from-gray-50 to-blue-50 rounded-xl p-6 border border-gray-200">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div className="bg-white rounded-lg p-3 shadow-sm">
                        <span className="text-gray-500 block mb-1">Roll Number</span>
                        <span className="font-semibold text-gray-900">{singleEnroll?.rollNo ?? student.rollNo}</span>
                      </div>
                      <div className="bg-white rounded-lg p-3 shadow-sm">
                        <span className="text-gray-500 block mb-1">Student ID</span>
                        <span className="font-semibold text-gray-900">{student.studentCode ?? '-'}</span>
                      </div>
                      <div className="bg-white rounded-lg p-3 shadow-sm">
                        <span className="text-gray-500 block mb-1">Section</span>
                        <span className="font-semibold text-gray-900">{singleEnroll?.section ?? student.section}</span>
                      </div>
                      <div className="bg-white rounded-lg p-3 shadow-sm">
                        <span className="text-gray-500 block mb-1">Contact</span>
                        <span className="font-semibold text-gray-900">{student.contact || '-'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Marks Table */}
                  <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr className="text-left">
                          <th rowSpan={2} className="py-3 px-4 font-semibold text-gray-700 text-center border-r border-gray-200">S.N</th>
                          <th rowSpan={2} className="py-3 px-4 font-semibold text-gray-700 border-r border-gray-200">Subjects</th>
                          <th colSpan={3} className="py-2 px-4 font-semibold text-gray-700 text-center border-r border-gray-200 border-b-2 border-b-gray-300">Theory</th>
                          <th colSpan={3} className="py-2 px-4 font-semibold text-gray-700 text-center border-r border-gray-200 border-b-2 border-b-gray-300">Practical</th>
                          <th rowSpan={2} className="py-3 px-4 font-semibold text-gray-700 text-center border-r border-gray-200">Total Obtained</th>
                          <th rowSpan={2} className="py-3 px-4 font-semibold text-gray-700 text-center">Grade</th>
                        </tr>
                        <tr className="text-left border-b-2 border-gray-300">
                          <th className="py-2 px-3 font-medium text-gray-600 text-xs text-center border-r border-gray-200">Obt.</th>
                          <th className="py-2 px-3 font-medium text-gray-600 text-xs text-center border-r border-gray-200">Conversion In</th>
                          <th className="py-2 px-3 font-medium text-gray-600 text-xs text-center border-r border-gray-200">Converted</th>
                          <th className="py-2 px-3 font-medium text-gray-600 text-xs text-center border-r border-gray-200">Obt.</th>
                          <th className="py-2 px-3 font-medium text-gray-600 text-xs text-center border-r border-gray-200">Conversion In</th>
                          <th className="py-2 px-3 font-medium text-gray-600 text-xs text-center border-r border-gray-200">Converted</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {(subjects as any[]).map((s: any, idx: number) => {
                          const subjParts = subjectParts.filter((p) => p.subjectId === s.id);
                          const hasParts = subjParts.length > 0;
                          const thPart = subjParts.find((p: any) => (p.partType && String(p.partType).toUpperCase() === "TH") || String(p.name).toUpperCase() === "TH" || String(p.name).toUpperCase().startsWith("THEORY"));
                          const prPart = subjParts.find((p: any) => (p.partType && String(p.partType).toUpperCase() === "PR") || String(p.name).toUpperCase() === "PR" || String(p.name).toUpperCase().startsWith("PRACTICAL"));
                          const sumForRaw = (predicate: (mk: any) => boolean) => {
                            let sum = 0;
                            for (const mk of marks as any[]) {
                              if (mk.subjectId === s.id && predicate(mk)) sum += Number((mk as any).obtained) || 0;
                            }
                            return sum;
                          };
                          const sumForConv = (predicate: (mk: any) => boolean) => {
                            let sum = 0;
                            for (const mk of marks as any[]) {
                              if (mk.subjectId === s.id && predicate(mk)) sum += Number((mk as any).converted) || 0;
                            }
                            return sum;
                          };
                          const thRaw = hasParts ? (thPart ? sumForRaw((mk) => mk.subjectPartId === thPart.id) : 0) : sumForRaw(() => true);
                          const thConv = hasParts ? (thPart ? sumForConv((mk) => mk.subjectPartId === thPart.id) : 0) : sumForConv(() => true);
                          const prRaw = hasParts ? (prPart ? sumForRaw((mk) => mk.subjectPartId === prPart.id) : 0) : 0;
                          const prConv = hasParts ? (prPart ? sumForConv((mk) => mk.subjectPartId === prPart.id) : 0) : 0;
                          const totRaw = hasParts ? sumForRaw(() => true) : thRaw;
                          const totConv = hasParts ? sumForConv(() => true) : thConv;
                          
                          // Get conversion factors for display
                          let thConversionIn = 30; // Default conversion factor
                          let prConversionIn = 0;
                          
                          if (hasParts) {
                            if (thPart) {
                              const thSetting = partSettingById.get(thPart.id);
                              thConversionIn = thSetting?.convertToMark || thSetting?.fullMark || 30;
                            }
                            if (prPart) {
                              const prSetting = partSettingById.get(prPart.id);
                              prConversionIn = prSetting?.convertToMark || prSetting?.fullMark || 0;
                            }
                          }
                          
                          // Compute effective full marks for this subject in this exam
                          let effectiveFull = 0;
                          if (hasParts) {
                            for (const p of subjParts as any[]) {
                              const setting = partSettingById.get(p.id);
                              if (setting) {
                                const target = setting.hasConversion && setting.convertToMark ? Number(setting.convertToMark) : Number(setting.fullMark);
                                effectiveFull += target;
                              } else {
                                // Fallback to class-level part definition target scale
                                const conv = (p as any).convertedFullMark ?? null;
                                const raw = (p as any).rawFullMark ?? 0;
                                effectiveFull += Number(conv ?? raw ?? 0);
                              }
                            }
                          } else {
                            const so = overrideBySubject[s.id] as any | undefined;
                            if (so) {
                              const hasConv = Boolean(so.hasConversion);
                              const convertTo = so.convertToMark ?? null;
                              const full = Number(so.fullMark ?? 0);
                              effectiveFull = hasConv && convertTo ? Number(convertTo) : full;
                            } else {
                              effectiveFull = Number((s as any).defaultFullMark ?? 0);
                            }
                          }
                          const percentage = effectiveFull > 0 ? ((totConv / effectiveFull) * 100) : 0;
                          const grade = percentage >= 80 ? 'A+' : percentage >= 70 ? 'A' : percentage >= 60 ? 'B+' : percentage >= 50 ? 'B' : percentage >= 40 ? 'C' : 'F';
                          
                          return (
                            <tr key={s.id} className="hover:bg-gray-50 transition-colors border-b border-gray-100">
                              <td className="py-3 px-4 text-gray-600 text-center border-r border-gray-200">{idx + 1}</td>
                              <td className="py-3 px-4 font-medium text-gray-900 border-r border-gray-200">{s.name}</td>
                              <td className="py-3 px-3 text-gray-700 text-center border-r border-gray-200">{thRaw || 0}</td>
                              <td className="py-3 px-3 text-gray-700 text-center border-r border-gray-200">{thConversionIn}</td>
                              <td className="py-3 px-3 text-gray-700 text-center border-r border-gray-200">{thConv.toFixed(1)}</td>
                              <td className="py-3 px-3 text-gray-700 text-center border-r border-gray-200">{prRaw || 0}</td>
                              <td className="py-3 px-3 text-gray-700 text-center border-r border-gray-200">{prConversionIn || 0}</td>
                              <td className="py-3 px-3 text-gray-700 text-center border-r border-gray-200">{prConv.toFixed(1)}</td>
                              <td className="py-3 px-4 font-semibold text-gray-900 text-center border-r border-gray-200">{totConv.toFixed(1)}</td>
                              <td className="py-3 px-4 text-center">
                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                  grade === 'A+' ? 'bg-green-100 text-green-800' :
                                  grade === 'A' ? 'bg-blue-100 text-blue-800' :
                                  grade === 'B+' ? 'bg-yellow-100 text-yellow-800' :
                                  grade === 'B' ? 'bg-orange-100 text-orange-800' :
                                  grade === 'C' ? 'bg-red-100 text-red-800' :
                                  'bg-gray-100 text-gray-800'
                                }`}>
                                  {grade}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                        
                        {/* Total Row */}
                        {(() => {
                          let thRawSum = 0, thConvSum = 0, prRawSum = 0, prConvSum = 0, totRawSum = 0, totConvSum = 0;
                          let thConversionSum = 0, prConversionSum = 0;
                          
                          for (const mk of marks as any[]) {
                            const sp = mk.subjectPartId ? subjectParts.find((p) => p.id === mk.subjectPartId) : null;
                            if (sp) {
                              const typ = (sp as any).partType ? String((sp as any).partType).toUpperCase() : undefined;
                              const nm = String(sp.name).toUpperCase();
                              if ((typ === "TH") || nm === "TH" || nm.startsWith("THEORY")) {
                                thRawSum += Number((mk as any).obtained) || 0;
                                thConvSum += Number((mk as any).converted) || 0;
                                const setting = partSettingById.get(sp.id);
                                thConversionSum += setting?.convertToMark || setting?.fullMark || 30;
                              } else if ((typ === "PR") || nm === "PR" || nm.startsWith("PRACTICAL")) {
                                prRawSum += Number((mk as any).obtained) || 0;
                                prConvSum += Number((mk as any).converted) || 0;
                                const setting = partSettingById.get(sp.id);
                                prConversionSum += setting?.convertToMark || setting?.fullMark || 0;
                              }
                            } else {
                              const hasPartsForSubject = subjectParts.some((p) => p.subjectId === mk.subjectId);
                              if (!hasPartsForSubject) {
                                thRawSum += Number((mk as any).obtained) || 0;
                                thConvSum += Number((mk as any).converted) || 0;
                              }
                            }
                            totRawSum += Number((mk as any).obtained) || 0;
                            totConvSum += Number((mk as any).converted) || 0;
                          }
                          return (
                            <tr className="bg-gray-100 font-bold border-t-2 border-gray-300">
                              <td className="py-3 px-4 border-r border-gray-200"></td>
                              <td className="py-3 px-4 text-gray-900 border-r border-gray-200">Total</td>
                              <td className="py-3 px-3 text-gray-900 text-center border-r border-gray-200">{thRawSum.toFixed(0)}</td>
                              <td className="py-3 px-3 text-gray-900 text-center border-r border-gray-200">{thConversionSum.toFixed(0)}</td>
                              <td className="py-3 px-3 text-gray-900 text-center border-r border-gray-200">{thConvSum.toFixed(0)}</td>
                              <td className="py-3 px-3 text-gray-900 text-center border-r border-gray-200">{prRawSum.toFixed(0)}</td>
                              <td className="py-3 px-3 text-gray-900 text-center border-r border-gray-200">{prConversionSum.toFixed(0)}</td>
                              <td className="py-3 px-3 text-gray-900 text-center border-r border-gray-200">{prConvSum.toFixed(0)}</td>
                              <td className="py-3 px-4 text-gray-900 font-bold text-center border-r border-gray-200">{totConvSum.toFixed(0)}</td>
                              <td className="py-3 px-4"></td>
                            </tr>
                          );
                        })()}
                      </tbody>
                    </table>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">TH = Theory, PR = Practical. Marks show Obtained/Conversion/Converted breakdown.</p>

                  {/* Result Summary */}
                  {result && (
                    <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-6 border border-green-200">
                      <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Exam Result Summary
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-white rounded-lg p-4 shadow-sm">
                          <div className="text-sm text-gray-500 mb-1">Percentage</div>
                          <div className="text-2xl font-bold text-green-600">{Number(result.percentage).toFixed(2)}%</div>
                        </div>
                        <div className="bg-white rounded-lg p-4 shadow-sm">
                          <div className="text-sm text-gray-500 mb-1">Class Rank</div>
                          <div className="text-2xl font-bold text-blue-600">{result.rank || '-'}</div>
                        </div>
                        <div className="bg-white rounded-lg p-4 shadow-sm">
                          <div className="text-sm text-gray-500 mb-1">Grade</div>
                          <div className="text-2xl font-bold text-purple-600">{result.grade || '-'}</div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )
            ) : selectedYear ? (
              <div className="space-y-6">
                <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-6 border border-indigo-200">
                  <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <svg className="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    Final Results - Year {selectedYear}
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-white rounded-lg p-4 shadow-sm">
                      <div className="text-sm text-gray-500 mb-1">Final Total</div>
                      <div className="text-xl font-bold text-indigo-600">{myFinalTotal != null ? Number(myFinalTotal).toFixed(2) : '-'}</div>
                    </div>
                    <div className="bg-white rounded-lg p-4 shadow-sm">
                      <div className="text-sm text-gray-500 mb-1">Average %</div>
                      <div className="text-xl font-bold text-green-600">{myFinalAvgPercent != null ? `${myFinalAvgPercent.toFixed(2)}%` : '-'}</div>
                    </div>
                    <div className="bg-white rounded-lg p-4 shadow-sm">
                      <div className="text-sm text-gray-500 mb-1">Class Rank</div>
                      <div className="text-xl font-bold text-blue-600">{myFinalRank ?? '-'}</div>
                    </div>
                    <div className="bg-white rounded-lg p-4 shadow-sm">
                      <div className="text-sm text-gray-500 mb-1">Division</div>
                      <div className="text-xl font-bold text-purple-600">-</div>
                    </div>
                  </div>
                  
                  {/* Subject-wise Final Results Table */}
                  {yearExams.length > 0 && (
                    <div className="mt-6 bg-white rounded-lg shadow-sm overflow-hidden">
                      <div className="px-6 py-4 bg-gray-50 border-b">
                        <h5 className="text-lg font-semibold text-gray-900">Subject Performance Overview</h5>
                        <p className="text-sm text-gray-600 mt-1">Marks across all exams in {selectedYear}</p>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="bg-indigo-50">
                            <tr>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Subject</th>
                              {yearExams.map((exam: any) => (
                                <th key={exam.id} className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  {exam.name}
                                </th>
                              ))}
                              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {(subjects as any[]).map((subject: any) => {
                              let totalAcrossExams = 0;
                              return (
                                <tr key={subject.id} className="hover:bg-gray-50">
                                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{subject.name}</td>
                                  {yearExams.map((exam: any) => {
                                    const marks = marksByExam[exam.id]?.[subject.id];
                                    const obtained = marks?.obtained || 0;
                                    totalAcrossExams += obtained;
                                    return (
                                      <td key={exam.id} className="px-4 py-3 text-sm text-center text-gray-700">
                                        {obtained > 0 ? Number(obtained).toFixed(2) : '-'}
                                      </td>
                                    );
                                  })}
                                  <td className="px-4 py-3 text-sm text-center font-semibold text-indigo-600">
                                    {totalAcrossExams > 0 ? Number(totalAcrossExams).toFixed(2) : '-'}
                                  </td>
                                </tr>
                              );
                            })}
                            {/* Totals Row */}
                            <tr className="bg-gray-50 font-semibold">
                              <td className="px-4 py-3 text-sm text-gray-900">Total</td>
                              {yearExams.map((exam: any) => {
                                const examTotal = totalsByExam[exam.id]?.obt || 0;
                                return (
                                  <td key={exam.id} className="px-4 py-3 text-sm text-center text-gray-900">
                                    {examTotal > 0 ? Number(examTotal).toFixed(2) : '-'}
                                  </td>
                                );
                              })}
                              <td className="px-4 py-3 text-sm text-center text-indigo-600">
                                {myFinalTotal != null ? Number(myFinalTotal).toFixed(2) : '-'}
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 text-center">
                <svg className="w-12 h-12 text-blue-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3a2 2 0 012-2h8a2 2 0 012 2v4m0 0V7a2 2 0 01-2 2H10a2 2 0 01-2-2V7m0 0V3" />
                </svg>
                <p className="text-blue-700 font-medium">Select a year to view final results</p>
              </div>
            )}
          </div>
        </section>

        {/* Quick Actions Section */}
        <section className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center gap-2">
            <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Quick Actions
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <a 
              href={`/dashboard/students?classId=${encodeURIComponent(student.classId)}`} 
              className="group flex items-center gap-3 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 border border-blue-200 rounded-xl transition-all duration-200"
            >
              <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center group-hover:bg-blue-600 transition-colors">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <div>
                <div className="font-semibold text-gray-909">Add Students</div>
                <div className="text-sm text-gray-600">Manage class students</div>
              </div>
            </a>
            
            <a 
              href={`/dashboard/exams?classId=${encodeURIComponent(student.classId)}`} 
              className="group flex items-center gap-3 p-4 bg-gradient-to-r from-green-50 to-emerald-50 hover:from-green-100 hover:to-emerald-100 border border-green-200 rounded-xl transition-all duration-200"
            >
              <div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center group-hover:bg-green-600 transition-colors">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                </svg>
              </div>
              <div>
                <div className="font-semibold text-gray-909">Input Marks</div>
                <div className="text-sm text-gray-600">Enter marks for exams</div>
              </div>
            </a>
            
            <a 
              href={`/dashboard/students/${student.id}/results`} 
              className="group flex items-center gap-3 p-4 bg-gradient-to-r from-purple-50 to-violet-50 hover:from-purple-100 hover:to-violet-100 border border-purple-200 rounded-xl transition-all duration-200"
            >
              <div className="w-12 h-12 bg-purple-500 rounded-xl flex items-center justify-center group-hover:bg-purple-600 transition-colors">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div>
                <div className="font-semibold text-gray-909">View Results</div>
                <div className="text-sm text-gray-600">Check all results</div>
              </div>
            </a>
          </div>
        </section>
      </div>
    </div>
  );
}