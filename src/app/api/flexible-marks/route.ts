import { db, tables } from "@/db/client";
import { and, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { examId, studentId, subjectId, marks } = body;

    // Basic validation
    if (!examId || !studentId || !subjectId || !Array.isArray(marks)) {
      return NextResponse.json(
        { error: "Missing required fields: examId, studentId, subjectId, marks" },
        { status: 400 }
      );
    }

    // TODO: Add proper authentication
    const userId = request.headers.get("x-user-id");
    if (!userId) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Check if student results are already published (locked)
    const publishedResult = await db
      .select()
      .from(tables.results)
      .where(
        and(
          eq(tables.results.examId, examId),
          eq(tables.results.studentId, studentId),
          eq(tables.results.isPublished, true)
        )
      )
      .limit(1);

    if (publishedResult.length > 0) {
      return NextResponse.json(
        { error: "Cannot modify marks for published results" },
        { status: 403 }
      );
    }

    // Delete existing marks for this student/subject/exam combination
    await db
      .delete(tables.marks)
      .where(
        and(
          eq(tables.marks.examId, examId),
          eq(tables.marks.studentId, studentId),
          eq(tables.marks.subjectId, subjectId)
        )
      );

    // Insert new marks
    const marksToInsert = marks.map((mark: any) => ({
      examId,
      studentId,
      subjectId,
      subjectPartId: mark.partId || null,
      obtained: mark.obtained,
      converted: mark.converted,
      createdByUserId: userId,
    }));

    if (marksToInsert.length > 0) {
      await db.insert(tables.marks).values(marksToInsert);
    }

    return NextResponse.json({
      success: true,
      message: "Marks saved successfully",
      marksCount: marksToInsert.length,
    });
  } catch (error) {
    console.error("Error saving flexible marks:", error);
    return NextResponse.json(
      { error: "Failed to save marks" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const examId = searchParams.get("examId");
    const studentId = searchParams.get("studentId");
    const subjectId = searchParams.get("subjectId");

    if (!examId || !studentId || !subjectId) {
      return NextResponse.json(
        { error: "Missing required query parameters: examId, studentId, subjectId" },
        { status: 400 }
      );
    }

    // TODO: Add proper authentication
    const userId = request.headers.get("x-user-id");
    if (!userId) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Get existing marks
    const existingMarks = await db
      .select({
        id: tables.marks.id,
        subjectPartId: tables.marks.subjectPartId,
        obtained: tables.marks.obtained,
        converted: tables.marks.converted,
      })
      .from(tables.marks)
      .where(
        and(
          eq(tables.marks.examId, examId),
          eq(tables.marks.studentId, studentId),
          eq(tables.marks.subjectId, subjectId)
        )
      );

    return NextResponse.json({
      success: true,
      marks: existingMarks.map(mark => ({
        partId: mark.subjectPartId || "",
        obtained: mark.obtained,
        converted: mark.converted,
      })),
    });
  } catch (error) {
    console.error("Error fetching flexible marks:", error);
    return NextResponse.json(
      { error: "Failed to fetch marks" },
      { status: 500 }
    );
  }
}
