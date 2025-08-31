import { db, tables } from "@/db/client";
import { and, eq } from "drizzle-orm";
import FlexibleMarksEntry from "@/components/FlexibleMarksEntry";
import FlexibleMarksSelectors from "@/components/FlexibleMarksSelectors";
import ExamSelector from "@/components/ExamSelector";
import { type Subject, type SubjectPart } from "@/lib/marks-calculator";

export default async function FlexibleMarksEntryPage({ 
  params, 
  searchParams 
}: { 
  params: Promise<{ id: string }>; 
  searchParams: Promise<{ subjectId?: string; studentId?: string }> 
}) {
  const pr = await params;
  const sp = await searchParams;
  const examId = pr.id;
  const selectedSubjectId = sp?.subjectId;
  const selectedStudentId = sp?.studentId;

  // Get exam details
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

  // Get subjects for the exam's class
  const subjects = (await db
    .select({
      id: tables.subjects.id,
      name: tables.subjects.name,
      code: tables.subjects.code,
      defaultFullMark: tables.subjects.defaultFullMark,
      creditHours: tables.subjects.creditHours,
    })
    .from(tables.subjects)
    .where(eq(tables.subjects.classId, exam.classId))) as any[];

  // Get students for the exam
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

  // Get subject parts for all subjects
  const allSubjectParts = subjects.length > 0 ? (await db
    .select({
      id: tables.subjectParts.id,
      subjectId: tables.subjectParts.subjectId,
      name: tables.subjectParts.name,
      partType: tables.subjectParts.partType,
      rawFullMark: tables.subjectParts.rawFullMark,
      convertedFullMark: tables.subjectParts.convertedFullMark,
      passMark: tables.subjectParts.passMark,
      sortOrder: tables.subjectParts.sortOrder,
      isActive: tables.subjectParts.isActive,
    })
    .from(tables.subjectParts)
    .where(and(
      eq(tables.subjectParts.isActive, true),
      eq(tables.subjectParts.subjectId, selectedSubjectId || subjects[0]?.id || "")
    ))) as any[] : [];

  // Get existing marks for the selected subject and student (if any)
  const existingMarks = selectedSubjectId && selectedStudentId ? (await db
    .select({
      id: tables.marks.id,
      subjectPartId: tables.marks.subjectPartId,
      obtained: tables.marks.obtained,
      converted: tables.marks.converted,
    })
    .from(tables.marks)
    .where(and(
      eq(tables.marks.examId, examId),
      eq(tables.marks.subjectId, selectedSubjectId),
      eq(tables.marks.studentId, selectedStudentId)
    ))) as any[] : [];

  // Published results for this exam -> lock those students from editing
  const publishedRows = (await db
    .select({ studentId: tables.results.studentId })
    .from(tables.results)
    .where(and(eq(tables.results.examId, examId), eq(tables.results.isPublished, true)))
  ) as Array<{ studentId: string }>;
  const lockedStudentIds = publishedRows.map((r) => r.studentId);

  const isStudentLocked = selectedStudentId ? lockedStudentIds.includes(selectedStudentId) : false;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-3">
        <a href="/dashboard/exams" className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md border hover:bg-neutral-100 dark:hover:bg-neutral-900 text-sm">← Back</a>
        <h1 className="text-xl font-semibold">Flexible Marks Entry — {exam.name}</h1>
        
        {/* Exam switcher */}
        <ExamSelector
          exams={siblingExams}
          currentExamId={examId}
          preserveQuery={{ subjectId: selectedSubjectId, studentId: selectedStudentId }}
        />
        
        {/* Subject mark settings button */}
        <a
          href={`/dashboard/exams/${encodeURIComponent(examId)}/settings${selectedSubjectId ? `?subjectId=${encodeURIComponent(selectedSubjectId)}` : ""}`}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md border hover:bg-neutral-100 dark:hover:bg-neutral-900 text-sm ml-auto"
          title="Subject mark settings for this exam"
        >
          Subject Settings
        </a>
      </div>

      {/* Subject and Student Selection */}
      <FlexibleMarksSelectors
        subjects={subjects}
        students={roster}
        selectedSubjectId={selectedSubjectId}
        selectedStudentId={selectedStudentId}
        examId={examId}
      />

      {/* Marks Entry Component */}
      {selectedSubjectId && selectedStudentId ? (
        <div className="bg-white dark:bg-neutral-800 rounded-lg border p-6">
          <FlexibleMarksEntry
            examId={examId}
            students={roster.map(s => ({
              id: s.studentId,
              name: s.name,
              rollNo: s.rollNo
            }))}
            subjects={[{
              id: selectedSubjectId,
              name: subjects.find(s => s.id === selectedSubjectId)?.name || "Unknown Subject",
              code: subjects.find(s => s.id === selectedSubjectId)?.code || null,
              defaultFullMark: subjects.find(s => s.id === selectedSubjectId)?.defaultFullMark || 100,
              creditHours: subjects.find(s => s.id === selectedSubjectId)?.creditHours || 1,
              parts: allSubjectParts.map(part => ({
                id: part.id,
                name: part.name,
                partType: part.partType as any,
                rawFullMark: part.rawFullMark,
                convertedFullMark: part.convertedFullMark,
                passMark: part.passMark,
                sortOrder: part.sortOrder,
                isActive: part.isActive
              })).sort((a, b) => a.sortOrder - b.sortOrder)
            }]}
            onSave={async (studentId, marks) => {
              try {
                const response = await fetch('/api/flexible-marks', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'x-user-id': 'temp-user-id', // TODO: Replace with actual user ID from auth
                  },
                  body: JSON.stringify({
                    examId,
                    studentId,
                    subjectId: selectedSubjectId,
                    marks: marks.map(mark => ({
                      partId: mark.partId,
                      obtained: mark.obtainedRawMark,
                      converted: mark.convertedMark || 0,
                    })),
                  }),
                });

                if (!response.ok) {
                  const error = await response.json();
                  throw new Error(error.error || 'Failed to save marks');
                }

                const result = await response.json();
                console.log('Marks saved successfully:', result);
              } catch (error) {
                console.error('Error saving marks:', error);
                throw error; // Re-throw to let FlexibleMarksEntry handle the error display
              }
            }}
          />
        </div>
      ) : (
        <div className="bg-neutral-50 dark:bg-neutral-800 rounded-lg border p-8 text-center">
          <p className="text-neutral-600 dark:text-neutral-400">
            Please select both a subject and a student to enter marks.
          </p>
        </div>
      )}

      {/* Navigation Links */}
      <div className="flex gap-3 pt-4 border-t">
        <a
          href={`/dashboard/exams/${encodeURIComponent(examId)}/marks`}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md border hover:bg-neutral-100 dark:hover:bg-neutral-900 text-sm"
        >
          Switch to Standard Marks Entry
        </a>
        <a
          href={`/dashboard/exams/${encodeURIComponent(examId)}/settings`}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md border hover:bg-neutral-100 dark:hover:bg-neutral-900 text-sm"
        >
          Exam Settings
        </a>
      </div>
    </div>
  );
}
