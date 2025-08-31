import { NextRequest, NextResponse } from "next/server";
import { db, tables } from "@/db/client";
import { requireAuthUser } from "@/app/dashboard/actions";
import { eq, and, inArray } from "drizzle-orm";
import { z } from "zod";

const MarkImportSchema = z.object({
  studentRollNo: z.number().int().positive("Roll number must be positive"),
  subjectName: z.string().min(1, "Subject name is required"),
  subjectPartName: z.string().optional(), // "Theory", "Practical", etc.
  obtained: z.number().min(0, "Obtained marks cannot be negative"),
  converted: z.number().min(0, "Converted marks cannot be negative").optional(),
});

const BulkMarksImportSchema = z.object({
  examId: z.string().uuid("Invalid exam ID"),
  classId: z.string().uuid("Invalid class ID"),
  marks: z.array(MarkImportSchema).min(1, "At least one mark entry is required"),
});

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuthUser();
    const body = await request.json();
    
    // Validate input
    const { examId, classId, marks } = BulkMarksImportSchema.parse(body);
    
    // Verify exam and class belong to user
    const [examExists, classExists] = await Promise.all([
      db.select({ id: tables.exams.id })
        .from(tables.exams)
        .where(and(
          eq(tables.exams.id, examId),
          eq(tables.exams.createdByUserId, user.id)
        ))
        .limit(1),
      db.select({ id: tables.classes.id })
        .from(tables.classes)
        .where(and(
          eq(tables.classes.id, classId),
          eq(tables.classes.userId, user.id)
        ))
        .limit(1)
    ]);
    
    if (examExists.length === 0) {
      return NextResponse.json(
        { error: "Exam not found or access denied" },
        { status: 404 }
      );
    }

    if (classExists.length === 0) {
      return NextResponse.json(
        { error: "Class not found or access denied" },
        { status: 404 }
      );
    }

    // Get all students in the class
    const students = await db
      .select({
        id: tables.students.id,
        rollNo: tables.students.rollNo,
        name: tables.students.name,
      })
      .from(tables.students)
      .where(eq(tables.students.classId, classId));

    const studentsByRollNo = new Map(students.map(s => [s.rollNo, s]));

    // Get all subjects for the class
    const subjects = await db
      .select({
        id: tables.subjects.id,
        name: tables.subjects.name,
      })
      .from(tables.subjects)
      .where(eq(tables.subjects.classId, classId));

    const subjectsByName = new Map(subjects.map(s => [s.name.toLowerCase(), s]));

    // Get all subject parts
    const subjectParts = await db
      .select({
        id: tables.subjectParts.id,
        subjectId: tables.subjectParts.subjectId,
        name: tables.subjectParts.name,
        rawFullMark: tables.subjectParts.rawFullMark,
        convertedFullMark: tables.subjectParts.convertedFullMark,
      })
      .from(tables.subjectParts)
      .where(inArray(tables.subjectParts.subjectId, subjects.map(s => s.id)));

    const subjectPartsBySubjectAndName = new Map();
    subjectParts.forEach(part => {
      const key = `${part.subjectId}-${part.name.toLowerCase()}`;
      subjectPartsBySubjectAndName.set(key, part);
    });

    // Validate and prepare marks for insertion
    const marksToInsert = [];
    const errors = [];

    for (let i = 0; i < marks.length; i++) {
      const mark = marks[i];
      const student = studentsByRollNo.get(mark.studentRollNo);
      
      if (!student) {
        errors.push(`Row ${i + 1}: Student with roll number ${mark.studentRollNo} not found`);
        continue;
      }

      const subject = subjectsByName.get(mark.subjectName.toLowerCase());
      if (!subject) {
        errors.push(`Row ${i + 1}: Subject "${mark.subjectName}" not found`);
        continue;
      }

      let subjectPart = null;
      if (mark.subjectPartName) {
        const partKey = `${subject.id}-${mark.subjectPartName.toLowerCase()}`;
        subjectPart = subjectPartsBySubjectAndName.get(partKey);
        if (!subjectPart) {
          errors.push(`Row ${i + 1}: Subject part "${mark.subjectPartName}" not found for subject "${mark.subjectName}"`);
          continue;
        }

        // Validate obtained marks against full marks
        if (mark.obtained > subjectPart.rawFullMark) {
          errors.push(`Row ${i + 1}: Obtained marks (${mark.obtained}) exceed full marks (${subjectPart.rawFullMark}) for ${mark.subjectName} - ${mark.subjectPartName}`);
          continue;
        }
      }

      // Calculate converted marks if not provided
      let convertedMarks = mark.converted;
      if (!convertedMarks && subjectPart) {
        // Convert from raw scale to converted scale
        convertedMarks = (mark.obtained / subjectPart.rawFullMark) * subjectPart.convertedFullMark;
      } else if (!convertedMarks) {
        convertedMarks = mark.obtained; // No conversion if no subject part
      }

      marksToInsert.push({
        studentId: student.id,
        subjectId: subject.id,
        subjectPartId: subjectPart?.id || null,
        examId,
        obtained: mark.obtained,
        converted: convertedMarks,
        createdByUserId: user.id,
      });
    }

    if (errors.length > 0) {
      return NextResponse.json(
        { 
          error: "Validation failed", 
          details: errors 
        },
        { status: 400 }
      );
    }

    // Check for existing marks to avoid duplicates
    const existingMarks = await db
      .select({
        studentId: tables.marks.studentId,
        subjectId: tables.marks.subjectId,
        subjectPartId: tables.marks.subjectPartId,
      })
      .from(tables.marks)
      .where(eq(tables.marks.examId, examId));

    const existingMarkKeys = new Set(
      existingMarks.map(m => `${m.studentId}-${m.subjectId}-${m.subjectPartId || 'null'}`)
    );

    const duplicateMarks = marksToInsert.filter(mark => 
      existingMarkKeys.has(`${mark.studentId}-${mark.subjectId}-${mark.subjectPartId || 'null'}`)
    );

    if (duplicateMarks.length > 0) {
      return NextResponse.json(
        { 
          error: "Some marks already exist for this exam", 
          count: duplicateMarks.length 
        },
        { status: 400 }
      );
    }

    // Insert marks in batch
    const insertedMarks = await db
      .insert(tables.marks)
      .values(marksToInsert)
      .returning({
        id: tables.marks.id,
        studentId: tables.marks.studentId,
        subjectId: tables.marks.subjectId,
        obtained: tables.marks.obtained,
        converted: tables.marks.converted,
      });

    return NextResponse.json({
      success: true,
      message: `Successfully imported ${insertedMarks.length} marks`,
      marksCount: insertedMarks.length,
    });

  } catch (error) {
    console.error("Bulk marks import error:", error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: "Validation failed", 
          details: error.issues 
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
