"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq, isNull } from "drizzle-orm";
import { db, tables } from "@/db/client";
import { generate8DigitCode } from "@/utils/id";
import { saveUploadedImage } from "@/utils/upload";
import { requireAuthUser } from "../actions";

// Convert any date-like input to a date-only string (YYYY-MM-DD) or null
function toDateOnly(input: string | null | undefined): string | null {
  if (!input) return null;
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return null;
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

// Detect Next.js redirect errors without relying on internal imports
function isNextRedirectError(e: unknown): boolean {
  try {
    const digest = (e as any)?.digest;
    return typeof digest === "string" && digest.startsWith("NEXT_REDIRECT");
  } catch {
    return false;
  }
}

export async function createStudent(formData: FormData) {
  try {
    const { id: userId } = await requireAuthUser();
    const name = String(formData.get("name") || "").trim();
    const rollNoRaw = String(formData.get("rollNo") ?? "").trim();
    const rollNo = rollNoRaw === "" ? NaN : Number(rollNoRaw);
    const classId = String(formData.get("classId") || "").trim();
    const sectionInput = String(formData.get("section") || "").trim();
    const genderRaw = String(formData.get("gender") || "").trim().toLowerCase();
    const dobRaw = String(formData.get("dob") || "").trim();
    const contact = String(formData.get("contact") || "").trim();
    const parentName = String(formData.get("parentName") || "").trim();
    const fathersName = String(formData.get("fathersName") || "").trim();
    const mothersName = String(formData.get("mothersName") || "").trim();
    const photoUrl = String(formData.get("photoUrl") || "").trim();
    const address = String(formData.get("address") || "").trim();

    if (!name) redirect(`/dashboard/students?error=${encodeURIComponent("Name is required")}`);
    if (!classId) redirect(`/dashboard/students?error=${encodeURIComponent("Class is required")}`);
    if (!Number.isFinite(rollNo) || rollNo <= 0) redirect(`/dashboard/students?error=${encodeURIComponent("Roll No must be a positive number")}`);
    if (genderRaw !== 'male' && genderRaw !== 'female') redirect(`/dashboard/students?error=${encodeURIComponent("Gender must be 'male' or 'female'")}`);

    // If section not provided in the form, fall back to the class's section. Allow null if neither present.
    const cls = await db
      .select()
      .from(tables.classes)
      .where(and(eq(tables.classes.id, classId as any), eq(tables.classes.userId as any, userId as any)))
      .limit(1);
    if (!cls.length) redirect(`/dashboard/students?error=${encodeURIComponent("Invalid class selected")}`);
    const section = sectionInput || (cls[0] as any).section || null;

    // Check for duplicate student (same roll number in same class/section for this user)
    const existingStudent = await db
      .select({ id: tables.students.id })
      .from(tables.students)
      .where(
        and(
          eq(tables.students.userId as any, userId as any),
          eq(tables.students.classId, classId as any),
          eq(tables.students.rollNo, rollNo as any),
          section 
            ? eq(tables.students.section, section)
            : isNull(tables.students.section)
        )
      )
      .limit(1);
    
    if (existingStudent.length > 0) {
      redirect(`/dashboard/students?error=${encodeURIComponent("Student with same roll number already exists in this class/section")}`);
    }

    // Determine final photo URL (file overrides text URL)
    let finalPhotoUrl: string | null = photoUrl || null;
    const uploaded = formData.get("photoFile");
    if (uploaded && typeof uploaded === "object" && (uploaded as File).arrayBuffer) {
      const file = uploaded as unknown as File;
      const size = (file as any).size ?? 0;
      if (size > 0) {
        try {
          finalPhotoUrl = await saveUploadedImage(file, "students");
        } catch {}
      }
    }

    const values: any = {
      name,
      rollNo,
      classId,
      section: section ?? null,
      gender: genderRaw,
      dob: toDateOnly(dobRaw),
      contact: contact || null,
      parentName: parentName || null,
      fathersName: fathersName || null,
      mothersName: mothersName || null,
      photoUrl: finalPhotoUrl || null,
      address: address || null,
      userId,
    };
    // Generate globally unique 8-digit studentCode
    for (let i = 0; i < 6; i++) {
      const code = generate8DigitCode();
      const existing = await db.select({ id: tables.students.id }).from(tables.students).where(eq(tables.students.studentCode as any, code as any)).limit(1);
      if (!existing.length) {
        values.studentCode = code;
        break;
      }
    }
    await db.insert(tables.students).values(values);
    revalidatePath("/dashboard/students");
    const qp = new URLSearchParams();
    qp.set("saved", "1");
    if (classId) qp.set("classId", classId);
    redirect(`/dashboard/students?${qp.toString()}`);
  } catch (e: any) {
    if (isNextRedirectError(e)) throw e; // allow intended redirects to bubble
    const msg = e?.message ? String(e.message) : "Failed to add student";
    redirect(`/dashboard/students?error=${encodeURIComponent(msg)}`);
  }
}

export async function getStudentsData() {
  const { id: userId } = await requireAuthUser();
  const classes = await db
    .select()
    .from(tables.classes)
    .where(eq(tables.classes.userId as any, userId as any));
  const students = await db
    .select()
    .from(tables.students)
    .where(eq(tables.students.userId as any, userId as any));
  return { classes, students };
}

export async function updateStudentAction(formData: FormData) {
  try {
  const { id: userId } = await requireAuthUser();
  const id = String(formData.get("id") || "").trim();
  const name = String(formData.get("name") || "").trim();
  const rollNoRaw = String(formData.get("rollNo") ?? "").trim();
  const rollNo = rollNoRaw === "" ? undefined : Number(rollNoRaw);
  const sectionRaw = String(formData.get("section") ?? "").trim();
  const section = sectionRaw === "" ? undefined : sectionRaw;
  const classId = String(formData.get("classId") || "").trim();
  const genderRaw = String(formData.get("gender") || "").trim().toLowerCase();
  const dobRaw = String(formData.get("dob") || "").trim();
  const contact = String(formData.get("contact") || "").trim();
  const parentName = String(formData.get("parentName") || "").trim();
  const fathersName = String(formData.get("fathersName") || "").trim();
  const mothersName = String(formData.get("mothersName") || "").trim();
  const photoUrl = String(formData.get("photoUrl") || "").trim();
  const address = String(formData.get("address") || "").trim();
  if (!id || !name) throw new Error("Missing required fields");
  // Determine final photo URL (file overrides text URL)
  let finalPhotoUrl: string | null = photoUrl || null;
  const uploaded = formData.get("photoFile");
  if (uploaded && typeof uploaded === "object" && (uploaded as File).arrayBuffer) {
    const file = uploaded as unknown as File;
    const size = (file as any).size ?? 0;
    if (size > 0) {
      try {
        finalPhotoUrl = await saveUploadedImage(file, "students");
      } catch {}
    }
  }

  const updateValues: any = {
    name,
    dob: toDateOnly(dobRaw),
    contact: contact || null,
    parentName: parentName || null,
    fathersName: fathersName || null,
    mothersName: mothersName || null,
    photoUrl: finalPhotoUrl || null,
    address: address || null,
  };
  if (rollNo !== undefined && !Number.isNaN(rollNo)) updateValues.rollNo = rollNo;
  if (section !== undefined) updateValues.section = section;
  if (genderRaw) {
    if (genderRaw !== 'male' && genderRaw !== 'female') throw new Error("Gender must be 'male' or 'female'");
    updateValues.gender = genderRaw;
  }
  await db
    .update(tables.students)
    .set(updateValues)
    .where(and(eq(tables.students.id, id as any), eq(tables.students.userId as any, userId as any)));
  revalidatePath("/dashboard/students");
  if (classId) revalidatePath(`/dashboard/classes/${classId}`);
  redirect(`/dashboard/students/${id}?saved=1`);
  } catch (e: any) {
    if (isNextRedirectError(e)) throw e;
    const msg = e?.message ? String(e.message) : "Failed to update student";
    const id = String(formData.get("id") || "").trim();
    redirect(`/dashboard/students/${id}?error=${encodeURIComponent(msg)}`);
  }
}

export async function deleteStudentAction(formData: FormData) {
  try {
    const { id: userId } = await requireAuthUser();
    const id = String(formData.get("id") || "").trim();
    const classId = String(formData.get("classId") || "").trim();
    if (!id) redirect(`/dashboard/students?error=${encodeURIComponent("Missing id")}`);

    // Check for dependent rows; block deletion if any exist
    const [marks, results, enrollments] = await Promise.all([
      db.select({ id: tables.marks.id }).from(tables.marks).where(eq(tables.marks.studentId, id as any)).limit(1),
      db.select({ id: tables.results.id }).from(tables.results).where(eq(tables.results.studentId, id as any)).limit(1),
      db
        .select({ id: tables.classEnrollments.id })
        .from(tables.classEnrollments)
        .where(eq(tables.classEnrollments.studentId, id as any))
        .limit(1),
    ]);

    if (marks.length || results.length || enrollments.length) {
      redirect(`/dashboard/students?error=${encodeURIComponent("Cannot delete student with marks/results/enrollments. Remove dependent records first.")}`);
    }

    await db
      .delete(tables.students)
      .where(and(eq(tables.students.id, id as any), eq(tables.students.userId as any, userId as any)));
    revalidatePath("/dashboard/students");
    if (classId) revalidatePath(`/dashboard/classes/${classId}`);
    redirect(`/dashboard/students?saved=1`);
  } catch (e: any) {
    if (isNextRedirectError(e)) throw e;
    const msg = e?.message ? String(e.message) : "Failed to delete student";
    redirect(`/dashboard/students?error=${encodeURIComponent(msg)}`);
  }
}
