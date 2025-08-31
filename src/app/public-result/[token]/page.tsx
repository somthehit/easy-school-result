import { db, tables } from "@/db/client";
import { eq, and } from "drizzle-orm";
import VerifyAndMarksheet from "./VerifyAndMarksheet";

export const dynamic = "force-dynamic";

export default async function PublicResultPage({ params }: { params: Promise<{ token: string }> }) {
  const pr = await params;
  let token = pr.token;
  // Handle cases where a full URL was passed as the dynamic segment (encoded)
  try {
    const decoded = decodeURIComponent(token);
    if (decoded.includes("/public-result/")) {
      const url = new URL(decoded);
      const parts = url.pathname.split("/");
      token = parts[parts.length - 1] || token;
    }
  } catch {
    // Not a URL; keep original token
  }
  const result = (
    await db
      .select()
      .from(tables.results)
      .where(and(eq(tables.results.shareToken as any, token as any), eq(tables.results.isPublished, true)))
      .limit(1)
  )[0];

  if (!result) {
    return (
      <div className="max-w-xl mx-auto p-6">
        <h1 className="text-2xl font-semibold mb-4">Result Not Found</h1>
        <p>Invalid or unpublished link.</p>
      </div>
    );
  }

  // Load student and exam for context
  const [student] = await db.select().from(tables.students).where(eq(tables.students.id, result.studentId));
  const [exam] = await db.select().from(tables.exams).where(eq(tables.exams.id, result.examId));
  const [cls] = exam
    ? await db.select().from(tables.classes).where(eq(tables.classes.id, exam.classId))
    : [null as any];

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-semibold text-violet-700">Public Result</h1>
      <div className="rounded-md border border-violet-300/70 p-4 space-y-1 shadow-sm">
        <div>
          <span className="font-medium">Student:</span> {student?.name} (Roll {student?.rollNo})
          {" "}
          <span className="text-neutral-500">• ID:</span> {student?.studentCode ?? "-"}
        </div>
        <div>
          <span className="font-medium">Class:</span> {cls?.name ?? "-"} | <span className="font-medium">Section:</span> {result.section}
        </div>
        <div>
          <span className="font-medium">Exam:</span> {exam?.name} ({exam?.term} - {exam?.year})
        </div>
        <div>
          <span className="font-medium">Total:</span> {Number(result.total).toFixed(2)} | <span className="font-medium">Percent:</span> {Number(result.percentage).toFixed(2)}%
        </div>
        <div>
          <span className="font-medium">Grade:</span> {result.grade} | <span className="font-medium">Division:</span> {result.division} | <span className="font-medium">Rank:</span> {result.rank}
        </div>
      </div>
      <div className="pt-2">
        <VerifyAndMarksheet token={token} />
      </div>
      <p className="text-sm text-gray-500">Only the student with this unique link can see this information.</p>
    </div>
  );
}
