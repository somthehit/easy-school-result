import { db, tables } from "@/db/client";
import { and, eq, inArray } from "drizzle-orm";
import ExamMarksEntryClient from "@/components/ExamMarksEntryClient";
import ExamMarksEntryByStudentClient from "@/components/ExamMarksEntryByStudentClient";
import ExamSelector from "@/components/ExamSelector";
import MarksViewToggle from "@/components/MarksViewToggle";

export default async function ExamMarksEntryPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ subjectId?: string; focusStudentId?: string; view?: string; studentId?: string }> }) {
  const pr = await params;
  const examId = pr.id;
  const examRows = await db.select().from(tables.exams).where(eq(tables.exams.id, examId)).limit(1);
  if (examRows.length === 0) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-red-600">Exam not found.</p>
        <a href="/dashboard/exams" className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md border hover:bg-neutral-100 dark:hover:bg-neutral-900 text-sm">← Back to Exams</a>
      </div>
    );
  }
  const exam = examRows[0] as any;

  // Other exams for the same class (to quickly switch)
  const siblingExams = (await db
    .select({ id: tables.exams.id, name: tables.exams.name, term: tables.exams.term, year: tables.exams.year })
    .from(tables.exams)
    .where(eq(tables.exams.classId, exam.classId))) as Array<{ id: string; name: string; term?: string | null; year?: number | null }>;

  // Subjects for the exam's class
  const subjects = (await db.select().from(tables.subjects).where(eq(tables.subjects.classId, exam.classId))) as any[];
  const sp = await searchParams;
  const view = sp?.view === "student" ? "student" : "subject";
  const subjectId = view === "subject" ? sp?.subjectId ?? (subjects[0]?.id || "") : "";
  const focusStudentId = sp?.focusStudentId;
  const selectedStudentId = sp?.studentId ?? "";

  // Year-scoped roster via classEnrollments for this exam's year
  let roster = (await db
    .select({
      studentId: tables.students.id,
      name: tables.students.name,
      rollNo: tables.classEnrollments.rollNo,
    })
    .from(tables.classEnrollments)
    .innerJoin(tables.students, eq(tables.students.id, tables.classEnrollments.studentId))
    .where(and(eq(tables.classEnrollments.classId, exam.classId), eq(tables.classEnrollments.year, exam.year)))
  ) as Array<{ studentId: string; name: string; rollNo: number }>;
  // Fallback: if no enrollments for the exam's year, list class students directly
  if (!roster.length) {
    const stu = await db
      .select({ id: tables.students.id, name: tables.students.name, rollNo: tables.students.rollNo })
      .from(tables.students)
      .where(eq(tables.students.classId, exam.classId));
    roster = (stu as any[]).map((s) => ({ studentId: s.id as string, name: s.name as string, rollNo: Number(s.rollNo) }))
      .sort((a, b) => a.rollNo - b.rollNo);
  }

  // Subject parts and per-exam part settings
  let parts: any[] = [];
  if (view === "subject") {
    parts = subjectId
      ? ((await db
          .select()
          .from(tables.subjectParts)
          .where(eq(tables.subjectParts.subjectId, subjectId))) as any[])
      : [];
  }
  const partSettings = ((await db
    .select()
    .from(tables.examSubjectPartSettings)
    .where(eq(tables.examSubjectPartSettings.examId, examId))) as any[]);

  // Marks
  let marks: any[] = [];
  if (view === "subject") {
    marks = subjectId
      ? ((await db
          .select()
          .from(tables.marks)
          .where(and(eq(tables.marks.examId, examId), eq(tables.marks.subjectId, subjectId)))) as any[])
      : [];
  } else if (view === "student" && selectedStudentId) {
    marks = ((await db
      .select()
      .from(tables.marks)
      .where(and(eq(tables.marks.examId, examId), eq(tables.marks.studentId, selectedStudentId)))) as any[]);
  }

  // Published results for this exam -> lock those students from editing
  const publishedRows = (await db
    .select({ studentId: tables.results.studentId })
    .from(tables.results)
    .where(and(eq(tables.results.examId, examId), eq(tables.results.isPublished, true)))
  ) as Array<{ studentId: string }>;
  const lockedStudentIds = publishedRows.map((r) => r.studentId);

  // Determine grading and parts
  let shapedParts: any[] = [];
  let fullMark = 0;
  let hasConversion = false;
  let convertToMark: number | null = null;
  if (view === "subject") {
    let override: any = null;
    try {
      const ov = await db
        .select()
        .from(tables.examSubjectSettings)
        .where(and(eq(tables.examSubjectSettings.examId, examId), eq(tables.examSubjectSettings.subjectId, subjectId)))
        .limit(1);
      override = ov[0] || null;
    } catch {
      override = null;
    }
    const subjRow = subjects.find((s) => s.id === subjectId);
    fullMark = override ? override.fullMark : subjRow?.fullMark ?? 0;
    hasConversion = Boolean(override ? override.hasConversion : subjRow?.hasConversion);
    convertToMark = override && override.convertToMark != null ? override.convertToMark : subjRow?.convertToMark ?? null;

    shapedParts = parts
      .map((p: any) => {
        const ps = partSettings.find((s: any) => s.subjectPartId === p.id);
        return {
          id: p.id as string,
          name: p.name as string,
          sortOrder: Number(p.sortOrder ?? 0),
          fullMark: ps?.fullMark ?? null,
          passMark: ps?.passMark ?? null,
          hasConversion: Boolean(ps?.hasConversion ?? false),
          convertToMark: ps?.convertToMark ?? null,
        };
      })
      .sort((a, b) => a.sortOrder - b.sortOrder);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-blue-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header Section */}
        <div className="flex items-center gap-4 mb-8">
          <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
            </svg>
          </div>
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-emerald-600 to-blue-600 bg-clip-text text-transparent">Enter Marks</h1>
            <p className="text-gray-600 mt-1">{exam.name} — {exam.term} ({exam.year})</p>
          </div>
        </div>

        {/* Back Button */}
        <div className="mb-8">
          <a href="/dashboard/exams" className="inline-flex items-center gap-2 px-4 py-2 bg-white rounded-xl border border-gray-200 hover:bg-gray-50 transition-all duration-200 shadow-sm hover:shadow-md">
            <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span className="text-gray-700 font-medium">Back to Exams</span>
          </a>
        </div>

        {/* Control Panel */}
        <section className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden mb-8">
          <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-white">Marks Entry Controls</h2>
            </div>
          </div>
          <div className="p-6">
            <div className="flex flex-wrap items-center gap-4">
              {/* View mode toggle */}
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700">Mode:</label>
                <MarksViewToggle
                  view={view as any}
                  subjectId={subjectId}
                  studentId={selectedStudentId}
                  defaultSubjectId={subjects[0]?.id || ""}
                  defaultStudentId={roster[0]?.studentId || ""}
                />
              </div>
              
              {/* Exam switcher */}
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700">Exam:</label>
                <ExamSelector
                  exams={siblingExams}
                  currentExamId={examId}
                  preserveQuery={{ view, subjectId, focusStudentId, studentId: selectedStudentId }}
                />
              </div>
              
              {/* Subject mark settings button */}
              <a
                href={`/dashboard/exams/${encodeURIComponent(examId)}/settings${view === "subject" && subjectId ? `?subjectId=${encodeURIComponent(subjectId)}` : ""}`}
                className="ml-auto inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-all duration-200 shadow-sm hover:shadow-md"
                title="Subject mark settings for this exam"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span className="font-medium">Subject Mark Settings</span>
              </a>
            </div>
          </div>
        </section>

        {/* Marks Entry Content */}
        <section className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-white">
                {view === "subject" ? "Subject-wise Entry" : "Student-wise Entry"}
              </h2>
            </div>
          </div>
          <div className="p-6">

            {view === "subject" ? (
              <ExamMarksEntryClient
                examId={examId}
                subjectId={subjectId}
                subjects={subjects.map((s) => ({ id: s.id, name: s.name }))}
                students={roster.map((s) => ({ id: s.studentId, name: s.name, rollNo: s.rollNo }))}
                parts={shapedParts}
                initialMarks={marks.map((m) => ({ studentId: m.studentId, subjectPartId: m.subjectPartId ?? null, obtained: Number(m.obtained), converted: Number(m.converted) }))}
                gradingBase={{ fullMark: Number(fullMark), hasConversion, convertToMark: convertToMark == null ? null : Number(convertToMark) }}
                lockedStudentIds={lockedStudentIds}
                focusStudentId={focusStudentId}
              />
            ) : (
              (() => {
                // Build partsBySubject for all subjects
                const partsBySubject: Record<string, any[]> = {};
                const subjIds = subjects.map((s) => s.id);
                // For performance, we could fetch all parts for all subjects; if not available here, do per subject sequentially server-side
                return (
                  <StudentViewWrapper
                    examId={examId}
                    subjects={subjects.map((s) => ({ id: s.id, name: s.name }))}
                    roster={roster}
                    selectedStudentId={selectedStudentId || roster[0]?.studentId || ""}
                    partSettings={partSettings}
                    lockedStudentIds={lockedStudentIds}
                    focusStudentId={focusStudentId}
                    marks={marks}
                  />
                );
              })()
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

// Helper server component to gather all parts for all subjects and pass to client in student view
async function StudentViewWrapper({
  examId,
  subjects,
  roster,
  selectedStudentId,
  partSettings,
  lockedStudentIds,
  focusStudentId,
  marks,
}: {
  examId: string;
  subjects: Array<{ id: string; name: string }>;
  roster: Array<{ studentId: string; name: string; rollNo: number }>;
  selectedStudentId: string;
  partSettings: any[];
  lockedStudentIds: string[];
  focusStudentId?: string;
  marks: any[];
}) {
  const subjIds = subjects.map((s) => s.id);
  const allParts = subjIds.length
    ? ((await db.select().from(tables.subjectParts).where(inArray(tables.subjectParts.subjectId, subjIds))) as any[])
    : [];
  const partsBySubject: Record<string, Array<{ id: string; name: string; sortOrder: number; fullMark: number | null; passMark: number | null; hasConversion: boolean; convertToMark: number | null }>> = {};
  for (const p of allParts) {
    const ps = partSettings.find((s: any) => s.subjectPartId === p.id);
    const shaped = {
      id: p.id as string,
      name: p.name as string,
      sortOrder: Number(p.sortOrder ?? 0),
      fullMark: ps?.fullMark ?? null,
      passMark: ps?.passMark ?? null,
      hasConversion: Boolean(ps?.hasConversion ?? false),
      convertToMark: ps?.convertToMark ?? null,
    };
    (partsBySubject[p.subjectId as string] ||= []).push(shaped);
  }
  for (const sid of Object.keys(partsBySubject)) {
    partsBySubject[sid].sort((a, b) => a.sortOrder - b.sortOrder);
  }

  // Initial marks for the selected student across all subjects
  const selectedMarks = marks
    .filter((m) => m.studentId === selectedStudentId)
    .map((m) => ({ subjectId: m.subjectId as string, subjectPartId: m.subjectPartId ?? null, obtained: Number(m.obtained), converted: Number(m.converted) }));

  return (
    <ExamMarksEntryByStudentClient
      examId={examId}
      subjects={subjects}
      students={roster.map((s) => ({ id: s.studentId, name: s.name, rollNo: s.rollNo }))}
      partsBySubject={partsBySubject}
      selectedStudentId={selectedStudentId}
      initialMarks={selectedMarks}
    />
  );
}
