import { NextRequest, NextResponse } from "next/server";
import { db, tables } from "@/db/client";
import { and, eq, inArray } from "drizzle-orm";

export async function POST(req: NextRequest) {
  try {
    const { token, dob } = await req.json();
    if (!token || !dob) {
      return NextResponse.json({ error: "token and dob are required" }, { status: 400 });
    }

    // Find the published result by token
    const [result] = await db
      .select()
      .from(tables.results)
      .where(and(eq(tables.results.shareToken as any, token as any), eq(tables.results.isPublished, true)))
      .limit(1);

    if (!result) {
      return NextResponse.json({ error: "Result not found" }, { status: 404 });
    }

    // Load student, exam, and school context
    const [student] = await db.select().from(tables.students).where(eq(tables.students.id, result.studentId));
    const [exam] = await db.select().from(tables.exams).where(eq(tables.exams.id, result.examId));
    
    // Load school details from the user who created this student
    const [schoolUser] = student ? await db.select({
      schoolName: tables.users.schoolName,
      schoolAddress: tables.users.schoolAddress,
      schoolContact: tables.users.schoolContact,
      estb: tables.users.estb,
      regNumber: tables.users.regNumber,
      principalName: tables.users.principalName,
      principalContact: tables.users.principalContact
    }).from(tables.users).where(eq(tables.users.id, student.userId)) : [null];

    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    // Verify DOB (compare as YYYY-MM-DD)
    const inputDate = new Date(dob);
    const studentDob = student.dob ? new Date(student.dob as any) : null;
    const fmt = (d: Date | null) => (d ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}` : "");
    if (!studentDob || fmt(inputDate) !== fmt(studentDob)) {
      return NextResponse.json({ ok: false, verified: false }, { status: 200 });
    }

    // Fetch all published results for this student in the same class/year (final marksheet scope)
    // Prefer results by same fiscalYear and classId to cover the academic session
    const allResults = await db
      .select({
        id: tables.results.id,
        examId: tables.results.examId,
        total: tables.results.total,
        percentage: tables.results.percentage,
        grade: tables.results.grade,
        division: tables.results.division,
        term: tables.results.term,
        fiscalYear: tables.results.fiscalYear,
      })
      .from(tables.results)
      .where(and(
        eq(tables.results.studentId, result.studentId),
        eq(tables.results.classId, result.classId),
        eq(tables.results.fiscalYear, result.fiscalYear)
      ));

    // Map exam metadata
    const examIds = Array.from(new Set(allResults.map(r => r.examId)));
    const exams = examIds.length
      ? await db.select().from(tables.exams).where(inArray(tables.exams.id, examIds as any))
      : [];
    const examById = new Map(exams.map((e: any) => [e.id, e]));

    const items = allResults.map((r) => ({
      examId: r.examId,
      examName: examById.get(r.examId)?.name || "",
      term: r.term,
      total: Number(r.total || 0),
      percentage: Number(r.percentage || 0),
      grade: r.grade,
      division: r.division,
    }));

    const grandTotal = items.reduce((acc, it) => acc + it.total, 0);
    const avgPercent = items.length ? (items.reduce((acc, it) => acc + it.percentage, 0) / items.length) : 0;

    // Subject-wise TH/PR totals across all exams in the session
    const sessionExamIds = Array.from(new Set(allResults.map(r => r.examId)));
    const subjectRows = await db
      .select({ id: tables.subjects.id, name: tables.subjects.name })
      .from(tables.subjects)
      .where(eq(tables.subjects.classId, result.classId));

    const subjectPartsRows = await db
      .select({ id: tables.subjectParts.id, subjectId: tables.subjectParts.subjectId, name: tables.subjectParts.name })
      .from(tables.subjectParts)
      .where(inArray(tables.subjectParts.subjectId, subjectRows.map(s => s.id) as any));
    const thPartBySubject = new Map<string, string | null>();
    const prPartBySubject = new Map<string, string | null>();
    subjectRows.forEach(s => { thPartBySubject.set(s.id, null); prPartBySubject.set(s.id, null); });
    subjectPartsRows.forEach(sp => {
      const nm = String(sp.name || '').toUpperCase();
      if (nm === 'TH') thPartBySubject.set(sp.subjectId, sp.id);
      if (nm === 'PR') prPartBySubject.set(sp.subjectId, sp.id);
    });

    const marksRows = sessionExamIds.length ? await db
      .select({ subjectId: tables.marks.subjectId, subjectPartId: tables.marks.subjectPartId, converted: tables.marks.converted })
      .from(tables.marks)
      .where(and(
        eq(tables.marks.studentId, result.studentId),
        inArray(tables.marks.examId, sessionExamIds as any)
      )) : [];

    const subjAgg = new Map<string, { th: number; pr: number }>();
    subjectRows.forEach(s => subjAgg.set(s.id, { th: 0, pr: 0 }));
    marksRows.forEach(mk => {
      const rec = subjAgg.get(mk.subjectId) || { th: 0, pr: 0 };
      const thId = thPartBySubject.get(mk.subjectId);
      const prId = prPartBySubject.get(mk.subjectId);
      const val = Number(mk.converted || 0);
      if (thId && mk.subjectPartId === thId) rec.th += val;
      else if (prId && mk.subjectPartId === prId) rec.pr += val;
      else if (!thId && !prId) rec.th += val; // no parts -> treat as TH bucket
      subjAgg.set(mk.subjectId, rec);
    });

    let subjects = subjectRows.map(s => ({
      id: s.id,
      name: s.name,
      thTotal: Number((subjAgg.get(s.id)?.th || 0).toFixed(2)),
      prTotal: Number((subjAgg.get(s.id)?.pr || 0).toFixed(2)),
      total: Number(((subjAgg.get(s.id)?.th || 0) + (subjAgg.get(s.id)?.pr || 0)).toFixed(2)),
    }));
    // Sort subjects by name asc for consistent display
    subjects.sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')));

    const subjectTotals = subjects.reduce(
      (acc, s) => {
        acc.thTotal += s.thTotal;
        acc.prTotal += s.prTotal;
        acc.total += s.total;
        return acc;
      },
      { thTotal: 0, prTotal: 0, total: 0 }
    );
    subjectTotals.thTotal = Number(subjectTotals.thTotal.toFixed(2));
    subjectTotals.prTotal = Number(subjectTotals.prTotal.toFixed(2));
    subjectTotals.total = Number(subjectTotals.total.toFixed(2));

    return NextResponse.json({
      ok: true,
      verified: true,
      student: { 
        id: student.id, 
        name: student.name, 
        rollNo: student.rollNo, 
        classId: student.classId, 
        section: student.section, 
        studentCode: (student as any).studentCode,
        fathersName: student.fathersName,
        mothersName: student.mothersName,
        parentName: student.parentName
      },
      school: schoolUser ? {
        name: schoolUser.schoolName,
        address: schoolUser.schoolAddress,
        contact: schoolUser.schoolContact,
        estb: schoolUser.estb,
        regNumber: schoolUser.regNumber,
        principalName: schoolUser.principalName,
        principalContact: schoolUser.principalContact
      } : null,
      contextExam: exam ? { id: exam.id, name: exam.name, term: exam.term, year: exam.year } : null,
      items,
      grandTotal,
      avgPercent,
      subjects,
      subjectTotals,
    });
  } catch (err) {
    console.error("/api/public-result/verify", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
