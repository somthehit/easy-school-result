import { requireAuthUser } from "../../actions";
import { db, tables } from "@/db/client";
import { eq } from "drizzle-orm";
import { createGlobalMasterSubject, deleteMasterSubjectAction, updateMasterSubjectAction } from "../../subjects/actions";
import SchoolDetailsForm from "@/components/SchoolDetailsForm";
import CreateGlobalMasterSubjectForm from "@/components/CreateGlobalMasterSubjectForm";
import MasterSubjectsList from "@/components/MasterSubjectsList";

export const dynamic = "force-dynamic";

export default async function ProfileSettingsPage({ searchParams }: { searchParams: Promise<{ search?: string; error?: string; saved?: string }> }) {
  const sp = await searchParams;
  const { id: userId } = await requireAuthUser();
  
  // Fetch user data for school details
  const user = await db
    .select()
    .from(tables.users)
    .where(eq(tables.users.id, userId as any))
    .limit(1)
    .then(rows => rows[0]);

  if (!user) {
    throw new Error("User not found");
  }
  
  // Fetch major subjects (now global, not class-specific)
  const masterSubjects = await db
    .select()
    .from(tables.masterSubjects)
    .orderBy(tables.masterSubjects.name);

  // Filter by search if provided
  const filteredSubjects = sp?.search 
    ? masterSubjects.filter(subject => 
        subject.name.toLowerCase().includes(sp.search!.toLowerCase())
      )
    : masterSubjects;

  const q = (sp?.search || "").toLowerCase();
  const error = sp?.error ? decodeURIComponent(String(sp.error)) : "";
  const saved = sp?.saved === "1";

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-purple-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header Section */}
        <div className="flex items-center gap-4 mb-8">
          <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-emerald-600 to-purple-600 bg-clip-text text-transparent">Profile Settings</h1>
            <p className="text-gray-600 mt-1">Manage your major subjects and preferences</p>
          </div>
        </div>

        {/* Status Messages */}
        {!!error && (
          <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 flex items-center gap-3">
            <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
              <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <p className="text-red-800 font-medium">{error}</p>
          </div>
        )}
        {saved && (
          <div className="mb-6 p-4 rounded-xl bg-green-50 border border-green-200 flex items-center gap-3">
            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
              <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            </div>
            <p className="text-green-800 font-medium">Settings saved successfully!</p>
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

        {/* Settings Tabs */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* School Details Section */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden mb-8">
              <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-6 py-4">
                <h2 className="text-xl font-bold text-white">School Details</h2>
              </div>
              <div className="p-6">
                <SchoolDetailsForm user={user} />
              </div>
            </div>
          </div>

          {/* Major Subjects Section */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden mb-8">
              <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  </div>
                  <h2 className="text-xl font-bold text-white">Create Major Subject</h2>
                </div>
              </div>
              <div className="p-6">
                <CreateGlobalMasterSubjectForm />
              </div>
            </div>
          </div>
        </div>

        {/* All Major Subjects Section */}
        <section className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
          <div className="bg-gradient-to-r from-purple-500 to-purple-600 px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-white">All Major Subjects</h2>
            </div>
          </div>
          <div className="p-6">
            {/* Search Section */}
            <form method="get" className="mb-6 bg-gray-50 rounded-xl p-4 border border-gray-100">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Search by Name</label>
                  <input name="q" defaultValue={q} placeholder="e.g., Science, Mathematics" className="w-full rounded-xl border border-gray-200 px-4 py-3 bg-white focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all duration-200" />
                </div>
                <div className="flex items-end">
                  <button type="submit" className="w-full px-6 py-3 bg-purple-500 hover:bg-purple-600 text-white font-medium rounded-xl transition-all duration-200 shadow-sm hover:shadow-md flex items-center justify-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    Search
                  </button>
                </div>
              </div>
            </form>

            {/* Major Subjects List */}
            {filteredSubjects.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
                <p className="text-gray-500 text-lg font-medium">No major subjects yet</p>
                <p className="text-gray-400 mt-1">Create your first major subject to get started</p>
              </div>
            ) : (
              <MasterSubjectsList subjects={(filteredSubjects as any[])} />
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
