import { db, tables } from "@/db/client";
import { createClassAction, updateClassAction, deleteClassAction } from "./actions";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { requireAuthUser } from "../actions";

export const dynamic = "force-dynamic";

export default async function ClassesPage({ searchParams }: { searchParams: Promise<{ error?: string; saved?: string }> }) {
  const sp = await searchParams;
  const { id: userId } = await requireAuthUser();
  const classes = await db
    .select()
    .from(tables.classes)
    .where(eq(tables.classes.userId as any, userId as any))
    .orderBy(tables.classes.name);

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-purple-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header Section */}
        <div className="flex items-center gap-4 mb-8">
          <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-emerald-600 to-purple-600 bg-clip-text text-transparent">Classes</h1>
            <p className="text-gray-600 mt-1">Manage your classes and organize students</p>
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
            <p className="text-green-800 font-medium">Saved successfully!</p>
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

        {/* Create Class Section */}
        <section className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden mb-8">
          <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-white">Create Class</h2>
            </div>
          </div>
          <div className="p-6">
            <form
              action={async (formData) => {
                "use server";
                await createClassAction(formData);
              }}
              className="grid grid-cols-1 md:grid-cols-4 gap-4"
            >
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Class Name</label>
                <input 
                  name="name" 
                  required 
                  placeholder="e.g., Grade 8" 
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 transition-all duration-200" 
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Section</label>
                <input 
                  name="section" 
                  placeholder="e.g., A (optional)" 
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 transition-all duration-200" 
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Year</label>
                <input 
                  name="year" 
                  type="number" 
                  required 
                  min={1900} 
                  max={3000} 
                  placeholder="e.g., 2081" 
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 transition-all duration-200" 
                />
              </div>
              <div className="flex items-end">
                <button 
                  type="submit" 
                  className="w-full px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-medium rounded-xl transition-all duration-200 shadow-sm hover:shadow-md flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Create
                </button>
              </div>
            </form>
          </div>
        </section>

        {/* All Classes Section */}
        <section className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
          <div className="bg-gradient-to-r from-purple-500 to-purple-600 px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-white">All Classes</h2>
            </div>
          </div>
          <div className="p-6">
            {classes.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <p className="text-gray-500 text-lg font-medium">No classes yet</p>
                <p className="text-gray-400 mt-1">Create your first class to get started</p>
              </div>
            ) : (
              <div className="space-y-4">
                {classes.map((c: any) => (
                  <div key={c.id} className="bg-gray-50 rounded-xl p-6 border border-gray-100">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
                          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                          </svg>
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-gray-900">{c.name}</h3>
                          <div className="flex items-center gap-4 mt-1">
                            <span className="text-sm text-gray-600 flex items-center gap-1">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3a2 2 0 012-2h4a2 2 0 012 2v4m-6 0V6a2 2 0 012-2h4a2 2 0 012 2v1m-6 0h8m-8 0H6a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V9a2 2 0 00-2-2h-2" />
                              </svg>
                              Year: {c.year ?? "Not set"}
                            </span>
                            <span className="text-sm text-gray-600 flex items-center gap-1">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                              </svg>
                              Section: {c.section || "None"}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <a
                          href={`/dashboard/classes/${c.id}`}
                          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-medium transition-all duration-200 shadow-sm hover:shadow-md"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                          View
                        </a>
                        <form
                          action={async (formData) => {
                            "use server";
                            await deleteClassAction(formData);
                          }}
                          className="inline"
                        >
                          <input type="hidden" name="id" value={c.id} />
                          <button 
                            type="submit" 
                            className="inline-flex items-center gap-2 px-4 py-2 bg-white border-2 border-red-200 text-red-600 hover:bg-red-50 rounded-xl font-medium transition-all duration-200"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            Delete
                          </button>
                        </form>
                      </div>
                    </div>

                    {/* Edit Form */}
                    <form
                      action={async (formData) => {
                        "use server";
                        await updateClassAction(formData);
                      }}
                      className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-white rounded-xl p-4 border border-gray-200"
                    >
                      <input type="hidden" name="id" value={c.id} />
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-gray-600">Class Name</label>
                        <input 
                          name="name" 
                          defaultValue={c.name} 
                          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-200" 
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-gray-600">Section</label>
                        <input 
                          name="section" 
                          defaultValue={c.section ?? ""} 
                          placeholder="Optional" 
                          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-200" 
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-gray-600">Year</label>
                        <input 
                          name="year" 
                          defaultValue={c.year ?? ""} 
                          placeholder="Year" 
                          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-200" 
                        />
                      </div>
                      <div className="flex items-end">
                        <button 
                          type="submit" 
                          className="w-full px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-all duration-200 text-sm flex items-center justify-center gap-2"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                          Update
                        </button>
                      </div>
                    </form>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
