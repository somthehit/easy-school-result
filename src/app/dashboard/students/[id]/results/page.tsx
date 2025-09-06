import { notFound } from 'next/navigation';
import { db, tables } from '@/db/client';
import { requireAuthUser } from '@/app/dashboard/actions';
import { eq, and, inArray } from 'drizzle-orm';
import StudentResultsClient from './StudentResultsClient';

interface StudentResultsPageProps {
  params: { id: string };
}

async function getStudentWithResults(studentId: string, userId: string) {
  // Get student details
  const student = await db
    .select()
    .from(tables.students)
    .where(and(
      eq(tables.students.id, studentId),
      eq(tables.students.userId, userId)
    ))
    .limit(1);

  if (student.length === 0) {
    return null;
  }

  // Get student's class
  const studentClass = await db
    .select()
    .from(tables.classes)
    .where(eq(tables.classes.id, student[0].classId))
    .limit(1);

  // Get all marks for this student with subject, subject part details, and exam-specific settings
  const marks = await db
    .select({
      id: tables.marks.id,
      obtained: tables.marks.obtained,
      converted: tables.marks.converted,
      examId: tables.marks.examId,
      examName: tables.exams.name,
      examTerm: tables.exams.term,
      examYear: tables.exams.year,
      subjectName: tables.subjects.name,
      subjectCode: tables.subjects.code,
      subjectPartName: tables.subjectParts.name,
      subjectPartType: tables.subjectParts.partType,
      rawFullMark: tables.subjectParts.rawFullMark,
      convertedFullMark: tables.subjectParts.convertedFullMark,
      // Exam-specific settings for proper conversion
      examFullMark: tables.examSubjectPartSettings.fullMark,
      examPassMark: tables.examSubjectPartSettings.passMark,
      examHasConversion: tables.examSubjectPartSettings.hasConversion,
      examConvertToMark: tables.examSubjectPartSettings.convertToMark,
    })
    .from(tables.marks)
    .leftJoin(tables.exams, eq(tables.marks.examId, tables.exams.id))
    .leftJoin(tables.subjects, eq(tables.marks.subjectId, tables.subjects.id))
    .leftJoin(tables.subjectParts, eq(tables.marks.subjectPartId, tables.subjectParts.id))
    .leftJoin(tables.examSubjectPartSettings, and(
      eq(tables.examSubjectPartSettings.examId, tables.marks.examId),
      eq(tables.examSubjectPartSettings.subjectPartId, tables.marks.subjectPartId)
    ))
    .where(eq(tables.marks.studentId, studentId));

  // Build class-wide stats per exam for ranking/comparison
  const examIds = Array.from(new Set((marks as any[]).map((m) => m.examId).filter(Boolean))) as string[];
  let examClassStats: Record<string, { percentage: number; total: number; possible: number; rank: number; division: string; grade: string; classSize: number }> = {};

  if (examIds.length && studentClass[0]?.id) {
    // Fetch all marks for the same class and the same exams
    const classExamMarks = await db
      .select({
        studentId: tables.marks.studentId,
        examId: tables.marks.examId,
        obtained: tables.marks.obtained,
        // subject part info
        rawFullMark: tables.subjectParts.rawFullMark,
        convertedFullMark: tables.subjectParts.convertedFullMark,
        // exam specific settings
        examFullMark: tables.examSubjectPartSettings.fullMark,
        examHasConversion: tables.examSubjectPartSettings.hasConversion,
        examConvertToMark: tables.examSubjectPartSettings.convertToMark,
      })
      .from(tables.marks)
      .leftJoin(tables.students, eq(tables.marks.studentId, tables.students.id))
      .leftJoin(tables.subjectParts, eq(tables.marks.subjectPartId, tables.subjectParts.id))
      .leftJoin(tables.examSubjectPartSettings, and(
        eq(tables.examSubjectPartSettings.examId, tables.marks.examId),
        eq(tables.examSubjectPartSettings.subjectPartId, tables.marks.subjectPartId)
      ))
      .where(and(
        eq(tables.students.classId, student[0].classId),
        inArray(tables.marks.examId, examIds)
      ));

    // Aggregate totals per exam per student
    const perExam: Record<string, Record<string, { total: number; possible: number }>> = {};
    for (const row of classExamMarks as any[]) {
      if (!row.examId || !row.studentId) continue;
      perExam[row.examId] ||= {};
      perExam[row.examId][row.studentId] ||= { total: 0, possible: 0 };

      const obtained = row.obtained ?? 0;
      const examFull = row.examFullMark ?? row.rawFullMark ?? 0;
      const convertTo = row.examConvertToMark ?? row.convertedFullMark ?? 0;
      const hasConv = !!row.examHasConversion;

      const converted = hasConv && examFull > 0 ? Number(((obtained / examFull) * convertTo).toFixed(1)) : obtained;
      perExam[row.examId][row.studentId].total += converted;
      perExam[row.examId][row.studentId].possible += convertTo;
    }

    // Compute percentage and rank for the requested student across the class
    for (const examId of examIds) {
      const entries = Object.entries(perExam[examId] || {}).map(([sid, v]) => ({ studentId: sid, ...v, percentage: v.possible > 0 ? (v.total / v.possible) * 100 : 0 }));
      // Sort desc by percentage, higher first
      entries.sort((a, b) => b.percentage - a.percentage);

      const classSize = entries.length;
      // assign ranks (1-based). Simple ranking (no ties handling for now)
      const rankMap: Record<string, number> = {};
      entries.forEach((e, idx) => { rankMap[e.studentId] = idx + 1; });

      const me = entries.find((e) => e.studentId === studentId);
      const percentage = me ? Number(me.percentage.toFixed(2)) : 0;
      const total = me?.total ?? 0;
      const possible = me?.possible ?? 0;
      const rank = me ? rankMap[studentId] : classSize;

      // derive division & grade similar to client
      const pctInt = Math.round(percentage);
      let grade = 'F';
      let division = 'Fail';
      if (pctInt >= 80) { grade = 'A+'; division = 'Distinction'; }
      else if (pctInt >= 70) { grade = 'A'; division = 'First'; }
      else if (pctInt >= 60) { grade = 'B+'; division = 'Second'; }
      else if (pctInt >= 50) { grade = 'B'; division = 'Third'; }
      else if (pctInt >= 40) { grade = 'C'; division = 'Pass'; }

      examClassStats[examId] = { percentage, total, possible, rank, division, grade, classSize };
    }
  }

  return {
    student: student[0],
    class: studentClass[0] || null,
    marks,
    examClassStats,
  };
}

export default async function StudentResultsPage({ params }: StudentResultsPageProps) {
  const user = await requireAuthUser();
  const { id } = await params;
  const data = await getStudentWithResults(id, user.id);

  if (!data) {
    notFound();
  }

  return <StudentResultsClient data={data} />;
}
