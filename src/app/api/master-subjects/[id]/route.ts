import { NextRequest, NextResponse } from "next/server";
import { safeDeleteMasterSubject, getSubjectsUsingMasterSubject } from "@/lib/master-subjects";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Get user ID from session/auth (you'll need to implement this based on your auth system)
    // For now, I'll assume you have a way to get the current user ID
    const userId = request.headers.get("x-user-id"); // Replace with your auth logic
    
    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const result = await safeDeleteMasterSubject(id, userId);

    if (result.success) {
      return NextResponse.json({ 
        message: result.message 
      });
    } else {
      return NextResponse.json(
        { 
          error: result.message,
          usageCount: result.usageCount 
        },
        { status: 400 }
      );
    }

  } catch (error) {
    console.error("Error in DELETE /api/master-subjects/[id]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");
    
    const userId = request.headers.get("x-user-id"); // Replace with your auth logic
    
    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    if (action === "usage") {
      // Get subjects using this master subject
      const subjects = await getSubjectsUsingMasterSubject(id, userId);
      return NextResponse.json({ subjects });
    }

    return NextResponse.json(
      { error: "Invalid action" },
      { status: 400 }
    );

  } catch (error) {
    console.error("Error in GET /api/master-subjects/[id]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
