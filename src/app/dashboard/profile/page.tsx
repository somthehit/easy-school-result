import { requireAuthUser } from "../actions";
import { db, tables } from "@/db/client";
import { eq } from "drizzle-orm";
import ProfileUpdateForm from "@/components/ProfileUpdateForm";
import PasswordChangeForm from "@/components/PasswordChangeForm";

export const dynamic = "force-dynamic";

export default async function ProfilePage({ searchParams }: { searchParams: Promise<{ error?: string; saved?: string }> }) {
  const sp = await searchParams;
  const { id: userId } = await requireAuthUser();
  
  const user = await db
    .select()
    .from(tables.users)
    .where(eq(tables.users.id, userId as any))
    .limit(1)
    .then(rows => rows[0]);

  if (!user) {
    throw new Error("User not found");
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-purple-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header Section */}
        <div className="flex items-center gap-4 mb-8">
          <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-emerald-600 to-purple-600 bg-clip-text text-transparent">Profile</h1>
            <p className="text-gray-600 mt-1">Manage your personal information</p>
          </div>
        </div>

        {/* Status Messages */}
        {sp?.error && (
          <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 flex items-center gap-3">
            <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
              <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <p className="text-red-800 font-medium">{decodeURIComponent(sp.error)}</p>
          </div>
        )}
        {sp?.saved === "1" && (
          <div className="mb-6 p-4 rounded-xl bg-green-50 border border-green-200 flex items-center gap-3">
            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
              <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            </div>
            <p className="text-green-800 font-medium">Profile updated successfully!</p>
          </div>
        )}

        {/* Back Button */}
        <div className="mb-8">
          <a href="/dashboard" className="inline-flex items-center gap-2 px-4 py-2 bg-white rounded-xl border border-gray-200 hover:bg-gray-50 transition-all duration-200 shadow-sm hover:shadow-md">
            <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span className="text-gray-700 font-medium">Back to Dashboard</span>
          </a>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Profile Photo Section */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
              <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 px-6 py-4">
                <h2 className="text-xl font-bold text-white">Profile Photo</h2>
              </div>
              <div className="p-6 text-center">
                <div className="mb-6">
                  {user.photoUrl ? (
                    <img 
                      src={user.photoUrl} 
                      alt="Profile" 
                      className="w-32 h-32 rounded-full object-cover mx-auto border-4 border-gray-100 shadow-lg"
                    />
                  ) : (
                    <div className="w-32 h-32 rounded-full bg-gradient-to-br from-emerald-400 to-purple-500 flex items-center justify-center mx-auto border-4 border-gray-100 shadow-lg">
                      <span className="text-3xl font-bold text-white">
                        {user.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                      </span>
                    </div>
                  )}
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">{user.name}</h3>
                <p className="text-gray-600 mb-4">{user.email}</p>
                <div className="text-sm text-gray-500">
                  <p>Member since {new Date(user.createdAt).toLocaleDateString()}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Personal Information Section */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
              <div className="bg-gradient-to-r from-purple-500 to-purple-600 px-6 py-4">
                <h2 className="text-xl font-bold text-white">Personal Information</h2>
              </div>
              <div className="p-6">
                <ProfileUpdateForm user={user} />
              </div>
            </div>
          </div>
        </div>

        {/* Change Password Section */}
        <div className="mt-8">
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
            <div className="bg-gradient-to-r from-blue-500 to-indigo-600 px-6 py-4">
              <h2 className="text-xl font-bold text-white">Change Password</h2>
            </div>
            <div className="p-6">
              <PasswordChangeForm />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
