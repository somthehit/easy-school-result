import { cookies } from "next/headers";
import { logoutAction } from "@/app/actions/auth";
import { redirect } from "next/navigation";
import { db, tables } from "@/db/client";
import { eq } from "drizzle-orm";
import { unstable_noStore as noStore } from "next/cache";

// Ensure Navbar is rendered per-request for the current user
export const dynamic = "force-dynamic";
export const revalidate = 0;

// Wrapper to satisfy form action type (must return void)
export async function doLogoutAction(): Promise<void> {
  "use server";
  await logoutAction();
  redirect("/login");
}

export default async function Navbar() {
  noStore();
  const store = await cookies();
  const raw = store.get("auth_user")?.value ?? "";
  let user: null | { id: string | number; name: string; email: string; photoUrl?: string | null } = null;
  try {
    user = raw ? JSON.parse(raw) : null;
  } catch {
    user = null;
  }
  const isLoggedIn = !!user;
  let photoUrl: string | null = null;
  if (isLoggedIn) {
    try {
      const row = (
        await db.select().from(tables.users).where(eq(tables.users.id, String(user!.id))).limit(1)
      )[0];
      photoUrl = (row as any)?.photoUrl ?? null;
    } catch {
      photoUrl = null;
    }
  }
  return (
    <header className="sticky top-0 z-40 w-full bg-gradient-to-r from-emerald-500 to-purple-600 text-white border-b border-transparent">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-2 flex items-center justify-between">
        <a href="/" className="flex items-center gap-2 font-extrabold tracking-tight text-xl" style={{fontFamily: 'var(--font-poppins), var(--font-geist-sans)'}}>
          <img src="/logo.svg" alt="Easy Result Logo" className="h-8 w-8" />
          Easy Result
        </a>
        <div className="flex items-center gap-2 sm:gap-3">
          <nav className="text-sm hidden sm:flex gap-1 sm:gap-2 font-medium items-center">
            {!isLoggedIn && (
              <>
                <a className="px-3 py-1.5 rounded-md text-white/90 hover:text-white transition-colors" href="/public-result">Check Result</a>
                <a className="px-3 py-1.5 rounded-md bg-white text-emerald-600 hover:bg-emerald-50 font-semibold transition-colors" href="/signup">Get Started</a>
              </>
            )}
            {isLoggedIn && (
              <>
                <a className="px-3 py-1.5 rounded-md text-white/90 hover:text-white transition-colors" href="/dashboard">Dashboard</a>
              </>
            )}
          </nav>
          {isLoggedIn && (
            <div className="relative group">
              <button className="inline-flex items-center gap-2 pl-2 group" title="Profile">
                {photoUrl ? (
                  <img src={photoUrl} alt="User" className="h-8 w-8 rounded-full object-cover border border-white/30 ring-0 group-hover:ring-2 group-hover:ring-white/50 transition" />
                ) : (
                  <span className="h-8 w-8 rounded-full bg-white/20 text-white flex items-center justify-center text-xs font-semibold ring-0 group-hover:ring-2 group-hover:ring-white/50 transition">
                    {String(user?.name ?? "").split(" ").map(s => s[0]).join("").slice(0,2).toUpperCase()}
                  </span>
                )}
              </button>
              
              {/* Dropdown Menu */}
              <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-100 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                <div className="py-2">
                  <a href="/dashboard/profile" className="flex items-center gap-3 px-4 py-2 text-gray-700 hover:bg-gray-50 transition-colors">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    Profile
                  </a>
                  <a href="/dashboard/profile/settings" className="flex items-center gap-3 px-4 py-2 text-gray-700 hover:bg-gray-50 transition-colors">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Settings
                  </a>
                  <hr className="my-1 border-gray-100" />
                  <form action={doLogoutAction} className="block">
                    <button type="submit" className="w-full flex items-center gap-3 px-4 py-2 text-red-600 hover:bg-red-50 transition-colors text-left">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      Logout
                    </button>
                  </form>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
