import { db, tables } from "@/db/client";
import { eq, and, count } from "drizzle-orm";

export interface MasterSubjectWithUsage {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
  usageCount: number;
  canDelete: boolean;
}

/**
 * Get master subjects with their usage count
 */
export async function getMasterSubjectsWithUsage(userId: string): Promise<MasterSubjectWithUsage[]> {
  try {
    // Get all master subjects for the user
    const masterSubjects = await db
      .select()
      .from(tables.masterSubjects)
      .where(eq(tables.masterSubjects.userId, userId));

    // Get usage count for each master subject
    const results: MasterSubjectWithUsage[] = [];
    
    for (const masterSubject of masterSubjects) {
      const usageResult = await db
        .select({ count: count() })
        .from(tables.subjects)
        .where(eq(tables.subjects.masterSubjectId, masterSubject.id));
      
      const usageCount = usageResult[0]?.count || 0;
      
      results.push({
        id: masterSubject.id,
        name: masterSubject.name,
        createdAt: masterSubject.createdAt,
        updatedAt: masterSubject.updatedAt,
        usageCount: Number(usageCount),
        canDelete: usageCount === 0,
      });
    }

    return results.sort((a, b) => a.name.localeCompare(b.name));
  } catch (error) {
    console.error('Error getting master subjects with usage:', error);
    throw error;
  }
}

/**
 * Safely delete a master subject (only if not in use)
 */
export async function safeDeleteMasterSubject(id: string, userId: string): Promise<{
  success: boolean;
  message: string;
  usageCount?: number;
}> {
  try {
    // Check if master subject exists and belongs to user
    const masterSubject = await db
      .select()
      .from(tables.masterSubjects)
      .where(and(
        eq(tables.masterSubjects.id, id),
        eq(tables.masterSubjects.userId, userId)
      ))
      .limit(1);

    if (masterSubject.length === 0) {
      return {
        success: false,
        message: "Master subject not found or you don't have permission to delete it."
      };
    }

    // Check usage count
    const usageResult = await db
      .select({ count: count() })
      .from(tables.subjects)
      .where(eq(tables.subjects.masterSubjectId, id));
    
    const usageCount = Number(usageResult[0]?.count || 0);

    if (usageCount > 0) {
      return {
        success: false,
        message: `Cannot delete "${masterSubject[0].name}" because it is used by ${usageCount} subject(s). Please remove or reassign those subjects first.`,
        usageCount
      };
    }

    // Safe to delete
    await db
      .delete(tables.masterSubjects)
      .where(and(
        eq(tables.masterSubjects.id, id),
        eq(tables.masterSubjects.userId, userId)
      ));

    return {
      success: true,
      message: `Master subject "${masterSubject[0].name}" deleted successfully.`
    };

  } catch (error) {
    console.error('Error deleting master subject:', error);
    return {
      success: false,
      message: "An error occurred while deleting the master subject."
    };
  }
}

/**
 * Get subjects using a specific master subject
 */
export async function getSubjectsUsingMasterSubject(masterSubjectId: string, userId: string) {
  try {
    const subjects = await db
      .select({
        id: tables.subjects.id,
        name: tables.subjects.name,
        className: tables.classes.name,
        classSection: tables.classes.section,
      })
      .from(tables.subjects)
      .leftJoin(tables.classes, eq(tables.subjects.classId, tables.classes.id))
      .where(and(
        eq(tables.subjects.masterSubjectId, masterSubjectId),
        eq(tables.subjects.userId, userId)
      ));

    return subjects;
  } catch (error) {
    console.error('Error getting subjects using master subject:', error);
    throw error;
  }
}

/**
 * Reassign subjects from one master subject to another
 */
export async function reassignSubjects(
  fromMasterSubjectId: string,
  toMasterSubjectId: string,
  userId: string
): Promise<{ success: boolean; message: string; affectedCount?: number }> {
  try {
    // Verify both master subjects exist and belong to user
    const masterSubjects = await db
      .select()
      .from(tables.masterSubjects)
      .where(and(
        eq(tables.masterSubjects.userId, userId)
      ));

    const fromSubject = masterSubjects.find(ms => ms.id === fromMasterSubjectId);
    const toSubject = masterSubjects.find(ms => ms.id === toMasterSubjectId);

    if (!fromSubject || !toSubject) {
      return {
        success: false,
        message: "One or both master subjects not found."
      };
    }

    // First, get the count of subjects to be updated
    const subjectsToUpdate = await db
      .select({ count: count() })
      .from(tables.subjects)
      .where(and(
        eq(tables.subjects.masterSubjectId, fromMasterSubjectId),
        eq(tables.subjects.userId, userId)
      ));

    const affectedCount = Number(subjectsToUpdate[0]?.count || 0);

    if (affectedCount === 0) {
      return {
        success: true,
        message: `No subjects were using "${fromSubject.name}".`,
        affectedCount: 0
      };
    }

    // Update all subjects using the old master subject
    await db
      .update(tables.subjects)
      .set({ 
        masterSubjectId: toMasterSubjectId,
        updatedAt: new Date()
      })
      .where(and(
        eq(tables.subjects.masterSubjectId, fromMasterSubjectId),
        eq(tables.subjects.userId, userId)
      ));

    return {
      success: true,
      message: `Successfully reassigned ${affectedCount} subject(s) from "${fromSubject.name}" to "${toSubject.name}".`,
      affectedCount
    };

  } catch (error) {
    console.error('Error reassigning subjects:', error);
    return {
      success: false,
      message: "An error occurred while reassigning subjects."
    };
  }
}
