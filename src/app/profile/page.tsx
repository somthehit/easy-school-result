import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db, tables } from "@/db/client";
import { eq } from "drizzle-orm";
import { updateProfileAction, changePasswordAction } from "@/app/actions/profile";
import PasswordInput from "@/components/PasswordInput";
import { doLogoutAction } from "@/components/Navbar";
import { unstable_noStore as noStore } from "next/cache";

// Ensure this page is always rendered per-request for the current user
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function ProfilePage() {
  noStore();
  const store = await cookies();
  const raw = store.get("auth_user")?.value ?? "";
  let auth: null | { id: string; name: string; email: string } = null;
  try {
    auth = raw ? JSON.parse(raw) : null;
  } catch {
    auth = null;
  }

  if (!auth) redirect("/login");

  const user = (
    await db.select().from(tables.users).where(eq(tables.users.id, auth.id)).limit(1)
  )[0];

  return (
    <div className="max-w-2xl mx-auto space-y-10">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Profile</h1>
        <form action={doLogoutAction}>
          <button type="submit" className="px-3 py-1.5 rounded-md bg-red-600 text-white hover:bg-red-700">Log out</button>
        </form>
      </div>

      <section className="rounded-lg border p-5">
        <h2 className="font-medium">Update profile</h2>
        <form action={async (fd) => { "use server"; await updateProfileAction(fd); }} className="mt-4 space-y-3">
          <div>
            <label className="block text-sm mb-1">Name</label>
            <input name="name" defaultValue={user?.name ?? ""} className="w-full px-3 py-2 rounded-md border bg-transparent" required />
          </div>
          <div>
            <label className="block text-sm mb-1">Email</label>
            <input name="email" defaultValue={user?.email ?? ""} className="w-full px-3 py-2 rounded-md border bg-neutral-100 dark:bg-neutral-900" disabled />
          </div>
          <div className="grid sm:grid-cols-2 gap-3 items-end">
            <div>
              <label className="block text-sm mb-1">Photo URL</label>
              <input name="photoUrl" defaultValue={(user as any)?.photoUrl ?? ""} placeholder="https://..." className="w-full px-3 py-2 rounded-md border bg-transparent" />
            </div>
            <div>
              <label className="block text-sm mb-1">Or upload image</label>
              <input type="file" name="photoFile" accept="image/*" className="block w-full text-sm" />
            </div>
            {(user as any)?.photoUrl && (
              <div className="sm:col-span-2 mt-2 flex items-center gap-3">
                <img src={(user as any).photoUrl} alt="Profile preview" className="h-12 w-12 rounded-full object-cover border" />
                <span className="text-xs text-neutral-500">This photo will appear in the navbar.</span>
              </div>
            )}
          </div>
          <div>
            <label className="block text-sm mb-1">School name</label>
            <input name="schoolName" defaultValue={user?.schoolName ?? ""} className="w-full px-3 py-2 rounded-md border bg-transparent" required />
          </div>
          <div>
            <label className="block text-sm mb-1">School address</label>
            <textarea name="schoolAddress" defaultValue={user?.schoolAddress ?? ""} className="w-full px-3 py-2 rounded-md border bg-transparent" rows={3} required />
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm mb-1">School contact</label>
              <input name="schoolContact" defaultValue={(user as any)?.schoolContact ?? ""} className="w-full px-3 py-2 rounded-md border bg-transparent" />
            </div>
            <div>
              <label className="block text-sm mb-1">Estb</label>
              <input name="estb" defaultValue={(user as any)?.estb ?? ""} className="w-full px-3 py-2 rounded-md border bg-transparent" />
            </div>
            <div>
              <label className="block text-sm mb-1">Registration number</label>
              <input name="regNumber" defaultValue={(user as any)?.regNumber ?? ""} className="w-full px-3 py-2 rounded-md border bg-transparent" />
            </div>
            <div>
              <label className="block text-sm mb-1">Principal name</label>
              <input name="principalName" defaultValue={(user as any)?.principalName ?? ""} className="w-full px-3 py-2 rounded-md border bg-transparent" />
            </div>
            <div>
              <label className="block text-sm mb-1">Principal contact</label>
              <input name="principalContact" defaultValue={(user as any)?.principalContact ?? ""} className="w-full px-3 py-2 rounded-md border bg-transparent" />
            </div>
          </div>
          <div className="pt-2">
            <button type="submit" className="px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700">Save changes</button>
          </div>
        </form>
      </section>

      <section className="rounded-lg border p-5">
        <h2 className="font-medium">Change password</h2>
        <form action={async (fd) => { "use server"; await changePasswordAction(fd); }} className="mt-4 space-y-3">
          <div>
            <label className="block text-sm mb-1">Current password</label>
            <PasswordInput name="currentPassword" placeholder="Current password" required />
          </div>
          <div>
            <label className="block text-sm mb-1">New password</label>
            <PasswordInput name="newPassword" placeholder="New password" required />
          </div>
          <div className="pt-2">
            <button type="submit" className="px-4 py-2 rounded-md bg-emerald-600 text-white hover:bg-emerald-700">Update password</button>
          </div>
        </form>
      </section>
    </div>
  );
}
