import { db, tables } from "@/db/client";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function ClassSettingsPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams?: Promise<{ [k: string]: string | string[] | undefined }> }) {
  const pr = await params;
  const sp = searchParams ? await searchParams : undefined;
  const classId = pr.id;

  const clsRows = await db.select().from(tables.classes).where(eq(tables.classes.id, classId)).limit(1);
  const cls = clsRows[0] as any;

  if (!cls) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-red-600">Class not found.</p>
        <Link href="/dashboard/classes" className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md border hover:bg-neutral-50 dark:hover:bg-neutral-900 text-sm">← Back to Classes</Link>
      </div>
    );
  }

  let setting: any = null;
  try {
    const s = await db.select().from(tables.classSettings).where(eq(tables.classSettings.classId, classId)).limit(1);
    setting = s[0] || null;
  } catch {}

  const saved = typeof sp?.saved !== "undefined";

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Class Settings — {cls.name} {cls.section}</h1>
      <div className="flex items-center gap-3">
        <Link href={`/dashboard/classes/${classId}`} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md border hover:bg-neutral-50 dark:hover:bg-neutral-900 text-sm">← Back to Class</Link>
        <Link href={`/dashboard/students?classId=${encodeURIComponent(classId)}`} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md border hover:bg-neutral-50 dark:hover:bg-neutral-900 text-sm">View Students</Link>
      </div>

      {saved && (
        <div className="px-3 py-2 rounded-md border border-green-600/30 bg-green-50 text-green-700 text-sm w-fit">
          Settings saved successfully
        </div>
      )}

      <FormUpsert classId={classId} setting={setting} />
    </div>
  );
}

function fieldVal(v: any) { return v ?? ""; }

async function upsertSettings(formData: FormData) {
  "use server";
  const classId = String(formData.get("classId"));
  const schoolName = String(formData.get("schoolName") ?? "").trim();
  const schoolAddress = String(formData.get("schoolAddress") ?? "").trim();
  const estb = String(formData.get("estb") ?? "").trim();
  const preparedBy = String(formData.get("preparedBy") ?? "").trim();
  const checkedBy = String(formData.get("checkedBy") ?? "").trim();
  const approvedBy = String(formData.get("approvedBy") ?? "").trim();
  // Removed parent signature label from class settings (use student's parent)

  try {
    // Upsert by class_id unique constraint
    await db
      .insert(tables.classSettings)
      .values({
        classId,
        schoolName,
        schoolAddress,
        estb: estb || null,
        preparedBy: preparedBy || null,
        checkedBy: checkedBy || null,
        approvedBy: approvedBy || null,
      } as any)
      .onConflictDoUpdate({
        target: tables.classSettings.classId,
        set: {
          schoolName,
          schoolAddress,
          estb: estb || null,
          preparedBy: preparedBy || null,
          checkedBy: checkedBy || null,
          approvedBy: approvedBy || null,
          updatedAt: new Date(),
        },
      });

    revalidatePath(`/dashboard/classes/${classId}/settings`);
    redirect(`/dashboard/classes/${classId}/settings?saved=1`);
  } catch (e: any) {
    return { ok: false, error: e?.message || "Failed to save settings" } as const;
  }
}

function FormUpsert({ classId, setting }: { classId: string; setting: any }) {
  return (
    <form
      action={async (formData) => {
        "use server";
        await upsertSettings(formData);
      }}
      className="space-y-4 max-w-3xl"
    >
      <input type="hidden" name="classId" value={classId} />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-sm text-neutral-600">School Name</label>
          <input name="schoolName" defaultValue={fieldVal(setting?.schoolName)} className="rounded-md border px-3 py-2 bg-transparent" required />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm text-neutral-600">Estb. Year (optional)</label>
          <input name="estb" defaultValue={fieldVal(setting?.estb)} className="rounded-md border px-3 py-2 bg-transparent" />
        </div>
        <div className="flex flex-col gap-1 sm:col-span-2">
          <label className="text-sm text-neutral-600">School Address</label>
          <input name="schoolAddress" defaultValue={fieldVal(setting?.schoolAddress)} className="rounded-md border px-3 py-2 bg-transparent" />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-sm text-neutral-600">Prepared By</label>
          <input name="preparedBy" defaultValue={fieldVal(setting?.preparedBy)} className="rounded-md border px-3 py-2 bg-transparent" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm text-neutral-600">Checked By</label>
          <input name="checkedBy" defaultValue={fieldVal(setting?.checkedBy)} className="rounded-md border px-3 py-2 bg-transparent" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm text-neutral-600">Approved By</label>
          <input name="approvedBy" defaultValue={fieldVal(setting?.approvedBy)} className="rounded-md border px-3 py-2 bg-transparent" />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button type="submit" className="px-3 py-1.5 rounded-md border hover:bg-neutral-100 dark:hover:bg-neutral-900">Save</button>
        <span className="text-xs text-neutral-500">These values will prefill the export header and signature block. Parent name comes from the student's record.</span>
      </div>
    </form>
  );
}
