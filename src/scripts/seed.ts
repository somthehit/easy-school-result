import { db, tables } from "@/db/client";
import { eq } from "drizzle-orm";
import { hashPassword } from "@/utils/crypto";
import { computeConverted, round2 } from "@/utils/marks";
import { gradeForPercentage } from "@/utils/grading";

async function main() {
  console.log("Seeding database...");

  // Clear existing simple approach (optional). Commented to avoid destructive ops by default.
  // await db.delete(tables.auditLogs);
  // await db.delete(tables.results);
  // await db.delete(tables.marks);
  // await db.delete(tables.exams);
  // await db.delete(tables.students);
  // await db.delete(tables.subjects);
  // await db.delete(tables.classes);
  // await db.delete(tables.users);

  // Create teachers
  const teacher1Pwd = await hashPassword("password123!");
  const teacher2Pwd = await hashPassword("password123!");
  const [t1] = await db
    .insert(tables.users)
    .values({
      name: "Alice Teacher",
      email: "alice@example.com",
      passwordHash: teacher1Pwd,
      schoolName: "Springfield High School",
      schoolAddress: "742 Evergreen Terrace, Springfield",
      emailVerifiedAt: new Date(),
    } as any)
    .returning();
  const [t2] = await db
    .insert(tables.users)
    .values({
      name: "Bob Teacher",
      email: "bob@example.com",
      passwordHash: teacher2Pwd,
      schoolName: "Shelbyville Secondary",
      schoolAddress: "123 Main Street, Shelbyville",
      emailVerifiedAt: new Date(),
    } as any)
    .returning();

  // Classes
  const [c1] = await db.insert(tables.classes).values({ name: "Grade 8", section: "A" }).returning();
  const [c2] = await db.insert(tables.classes).values({ name: "Grade 8", section: "B" }).returning();

  // Subjects (6 total across classes)
  const subjects = await db
    .insert(tables.subjects)
    .values([
      { name: "Math", classId: c1.id, fullMark: 100, passMark: 40, hasConversion: false },
      { name: "Science", classId: c1.id, fullMark: 100, passMark: 40, hasConversion: true, convertToMark: 75 },
      { name: "English", classId: c1.id, fullMark: 100, passMark: 40, hasConversion: false },
      { name: "Social", classId: c2.id, fullMark: 100, passMark: 40, hasConversion: false },
      { name: "Nepali", classId: c2.id, fullMark: 100, passMark: 40, hasConversion: true, convertToMark: 50 },
      { name: "Computer", classId: c2.id, fullMark: 50, passMark: 20, hasConversion: false },
    ])
    .returning();

  // Students (10)
  const students: typeof tables.students.$inferInsert[] = [];
  for (let i = 1; i <= 10; i++) {
    const isC1 = i <= 5;
    students.push({
      name: `Student ${i}`,
      rollNo: i,
      classId: isC1 ? c1.id : c2.id,
      section: isC1 ? c1.section : c2.section,
      dob: new Date(2011, 0, i),
      contact: `98${(10000000 + i).toString().slice(0, 8)}`,
      parentName: `Parent ${i}`,
      address: `Street ${i}`,
    } as any);
  }
  const insertedStudents = await db.insert(tables.students).values(students).returning();

  // Exams
  const [e1] = await db
    .insert(tables.exams)
    .values({ name: "First Term", term: "Term 1", year: 2081, classId: c1.id, createdByUserId: t1.id })
    .returning();
  const [e2] = await db
    .insert(tables.exams)
    .values({ name: "First Term", term: "Term 1", year: 2081, classId: c2.id, createdByUserId: t2.id })
    .returning();

  // Marks and results for each exam
  async function seedForExam(exam: typeof e1, teacherId: string) {
    const subs = subjects.filter((s) => s.classId === exam.classId);
    const classStudents = insertedStudents.filter((s) => s.classId === exam.classId);

    const marksToInsert: typeof tables.marks.$inferInsert[] = [];
    for (const st of classStudents) {
      for (const sub of subs) {
        const obtained = Math.floor(Math.random() * (sub.fullMark + 1));
        const converted = computeConverted(obtained, sub.fullMark, sub.hasConversion, sub.convertToMark);
        marksToInsert.push({
          studentId: (st as any).id,
          subjectId: sub.id,
          examId: exam.id,
          obtained,
          converted,
          createdByUserId: teacherId,
        } as any);
      }
    }
    await db.insert(tables.marks).values(marksToInsert);

    // Aggregate to results
    for (const st of classStudents) {
      const stMarks = marksToInsert.filter((m) => m.studentId === (st as any).id);
      const total = round2(stMarks.reduce((acc, m) => acc + Number(m.converted), 0));
      const fullTotal = subs.reduce((acc, s) => acc + (s.hasConversion && s.convertToMark ? s.convertToMark : s.fullMark), 0);
      const percentage = fullTotal > 0 ? round2((total / fullTotal) * 100) : 0;
      const { grade, division } = gradeForPercentage(percentage);
      await db.insert(tables.results).values({
        studentId: (st as any).id,
        examId: exam.id,
        total,
        percentage,
        grade,
        division,
        rank: 0, // we'll roughly assign below
        createdByUserId: teacherId,
        fiscalYear: exam.year,
        term: exam.term,
        classId: exam.classId,
        section: st.section,
        isPublished: false,
      } as any);
    }

    // Compute ranks
    const resRows = await db.select().from(tables.results).where(eq(tables.results.examId, exam.id));
    resRows.sort((a, b) => Number(b.percentage) - Number(a.percentage));
    let rank = 1;
    for (const r of resRows) {
      await db.update(tables.results).set({ rank }).where(eq(tables.results.id, (r as any).id));
      rank++;
    }
  }

  await seedForExam(e1, t1.id);
  await seedForExam(e2, t2.id);

  console.log("Seeding completed.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
