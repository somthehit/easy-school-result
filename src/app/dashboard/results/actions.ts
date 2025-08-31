"use server";

import { revalidatePath } from "next/cache";
import { db, tables } from "@/db/client";
import { and, eq, desc } from "drizzle-orm";

export async function getResultsData(examId?: string) {
  const exams = await db.select().from(tables.exams).orderBy(desc(tables.exams.createdAt));
  const results = examId
    ? await db
        .select()
        .from(tables.results)
        .where(eq(tables.results.examId, examId))
    : [];
  return { exams, results };
}
