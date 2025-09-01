import { notFound } from 'next/navigation';
import { db, tables } from '@/db/client';
import { requireAuthUser } from '@/app/dashboard/actions';
import { eq, and } from 'drizzle-orm';
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

  // Get all marks for this student with subject and subject part details
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
    })
    .from(tables.marks)
    .leftJoin(tables.exams, eq(tables.marks.examId, tables.exams.id))
    .leftJoin(tables.subjects, eq(tables.marks.subjectId, tables.subjects.id))
    .leftJoin(tables.subjectParts, eq(tables.marks.subjectPartId, tables.subjectParts.id))
    .where(eq(tables.marks.studentId, studentId));

  return {
    student: student[0],
    class: studentClass[0] || null,
    marks,
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
