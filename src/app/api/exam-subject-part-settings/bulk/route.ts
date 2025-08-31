import { NextRequest, NextResponse } from "next/server";
import { db, tables } from "@/db/client";
import { cookies } from "next/headers";
import { and, eq, inArray } from "drizzle-orm";

function requireAuthUser() {
  const raw = (cookies() as any).get?.("auth_user")?.value as string | undefined;
  if (!raw) throw new Error("Unauthorized");
  try {
    const u = JSON.parse(raw) as { id: string; name: string; email: string };
    if (!u?.id) throw new Error("Unauthorized");
    return u;
  } catch {
    throw new Error("Unauthorized");
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = requireAuthUser();
    const body = await req.json();
    const { examId, items } = body as {
      examId: string;
      items: Array<{ 
        subjectId: string; 
        partType: string; 
        fullMark: number; 
        passMark: number; 
        hasConversion?: boolean; 
        convertToMark?: number | null 
      }>;
    };
    if (!examId || !Array.isArray(items)) return NextResponse.json({ ok: false, error: "Invalid payload" }, { status: 400 });

    // Create or update subject parts and their settings
    for (const it of items) {
      if (!it.subjectId || !it.partType) continue;
      const fm = Number(it.fullMark || 0);
      const pm = Number(it.passMark || 0);
      const hc = Boolean(it.hasConversion);
      const cto = it.convertToMark == null ? null : Number(it.convertToMark);

      // First, ensure the subject part exists
      let subjectPart;
      try {
        const existingParts = await db
          .select()
          .from(tables.subjectParts)
          .where(and(
            eq(tables.subjectParts.subjectId, it.subjectId),
            eq(tables.subjectParts.partType, it.partType)
          ));
        
        if (existingParts.length > 0) {
          subjectPart = existingParts[0];
        } else {
          // Create the subject part
          const newParts = await db
            .insert(tables.subjectParts)
            .values({
              name: it.partType === 'TH' ? 'Theory' : it.partType === 'PR' ? 'Practical' : it.partType,
              userId: user.id,
              subjectId: it.subjectId,
              partType: it.partType,
              rawFullMark: fm,
              convertedFullMark: fm,
              passMark: pm,
              sortOrder: it.partType === 'TH' ? 1 : it.partType === 'PR' ? 2 : 3,
              isActive: true
            })
            .returning();
          subjectPart = newParts[0];
        }
      } catch (e) {
        console.error('Error creating subject part:', e);
        continue;
      }

      // Now create or update the exam-specific part settings
      try {
        const updated = await db
          .update(tables.examSubjectPartSettings)
          .set({ fullMark: fm, passMark: pm, hasConversion: hc, convertToMark: cto })
          .where(and(
            eq(tables.examSubjectPartSettings.examId, examId), 
            eq(tables.examSubjectPartSettings.subjectPartId, subjectPart.id)
          ))
          .returning({ id: tables.examSubjectPartSettings.id });
          
        if ((updated as any[]).length === 0) {
          await db.insert(tables.examSubjectPartSettings).values({
            examId,
            subjectPartId: subjectPart.id,
            fullMark: fm,
            passMark: pm,
            hasConversion: hc,
            convertToMark: cto,
          });
        }
      } catch (e) {
        console.error('Error saving exam part settings:', e);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Server error" }, { status: 500 });
  }
}
