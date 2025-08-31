import { NextRequest, NextResponse } from "next/server";
import { db, tables } from "@/db/client";
import { requireAuthUser } from "@/app/dashboard/actions";
import { eq, and } from "drizzle-orm";
import { z } from "zod";

const StudentImportSchema = z.object({
  name: z.string().min(1, "Name is required"),
  rollNo: z.number().int().positive("Roll number must be positive"),
  section: z.string().optional(),
  dob: z.string().optional(), // Date string in YYYY-MM-DD format
  contact: z.string().optional(),
  parentName: z.string().optional(),
  fathersName: z.string().optional(),
  mothersName: z.string().optional(),
  address: z.string().optional(),
  gender: z.enum(["Male", "Female", "Other"]),
  studentCode: z.string().optional(),
});

const BulkImportSchema = z.object({
  classId: z.string().uuid("Invalid class ID"),
  students: z.array(StudentImportSchema).min(1, "At least one student is required"),
});

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuthUser();
    const body = await request.json();
    
    // Validate input
    const { classId, students } = BulkImportSchema.parse(body);
    
    // Verify class belongs to user
    const classExists = await db
      .select({ id: tables.classes.id })
      .from(tables.classes)
      .where(and(
        eq(tables.classes.id, classId),
        eq(tables.classes.userId, user.id)
      ))
      .limit(1);
    
    if (classExists.length === 0) {
      return NextResponse.json(
        { error: "Class not found or access denied" },
        { status: 404 }
      );
    }

    // Check for duplicate roll numbers in the class
    const existingRollNos = await db
      .select({ rollNo: tables.students.rollNo })
      .from(tables.students)
      .where(eq(tables.students.classId, classId));
    
    const existingRollNoSet = new Set(existingRollNos.map(s => s.rollNo));
    const newRollNos = students.map(s => s.rollNo);
    const duplicateRollNos = newRollNos.filter(rollNo => existingRollNoSet.has(rollNo));
    
    if (duplicateRollNos.length > 0) {
      return NextResponse.json(
        { 
          error: "Duplicate roll numbers found", 
          duplicates: duplicateRollNos 
        },
        { status: 400 }
      );
    }

    // Check for duplicate roll numbers within the import data
    const importRollNoSet = new Set();
    const internalDuplicates = [];
    for (const student of students) {
      if (importRollNoSet.has(student.rollNo)) {
        internalDuplicates.push(student.rollNo);
      }
      importRollNoSet.add(student.rollNo);
    }

    if (internalDuplicates.length > 0) {
      return NextResponse.json(
        { 
          error: "Duplicate roll numbers in import data", 
          duplicates: internalDuplicates 
        },
        { status: 400 }
      );
    }

    // Prepare students for insertion
    const studentsToInsert = students.map(student => ({
      name: student.name,
      rollNo: student.rollNo,
      classId,
      section: student.section || null,
      dob: student.dob || null, // Keep as string, schema expects string
      contact: student.contact || null,
      parentName: student.parentName || null,
      fathersName: student.fathersName || null,
      mothersName: student.mothersName || null,
      address: student.address || null,
      gender: student.gender,
      studentCode: student.studentCode || null,
      userId: user.id,
      photoUrl: null,
    }));

    // Insert students in batch
    const insertedStudents = await db
      .insert(tables.students)
      .values(studentsToInsert)
      .returning({
        id: tables.students.id,
        name: tables.students.name,
        rollNo: tables.students.rollNo,
      });

    return NextResponse.json({
      success: true,
      message: `Successfully imported ${insertedStudents.length} students`,
      students: insertedStudents,
    });

  } catch (error) {
    console.error("Bulk import error:", error);
    
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
