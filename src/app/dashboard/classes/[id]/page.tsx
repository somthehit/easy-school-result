import { db, tables } from "@/db/client";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { updateStudentAction, deleteStudentAction } from "../../students/actions";
import { deleteSubjectAction } from "../../subjects/actions";
import { updateExamAction, deleteExamAction } from "../../actions";

export const dynamic = "force-dynamic";

export default async function ClassDetailPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string; saved?: string }> }) {
  const pr = await params;
  const sp = await searchParams;
  const id = pr.id;

  let cls: any[] = [];
  try {
    cls = (await db.select().from(tables.classes).where(eq(tables.classes.id, id)).limit(1)) as any[];
  } catch (e: any) {
    return (
      <div className="space-y-3">
        <div className="rounded-md border border-red-300 bg-red-50 text-red-800 px-3 py-2 text-sm">
          Failed to load class. {e?.message ?? "Unknown error."}
        </div>
        <a href="/dashboard/classes" className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md border hover:bg-neutral-100 dark:hover:bg-neutral-900 text-sm">← Back to Classes</a>
      </div>
    );
  }
  if (!cls.length) return notFound();
  const klass = cls[0];

  const [subjectsRes, studentsRes, examsRes, resultsRes] = await Promise.allSettled([
    db.select().from(tables.subjects).where(eq(tables.subjects.classId, id)),
    db.select().from(tables.students).where(eq(tables.students.classId, id)),
    db.select().from(tables.exams).where(eq(tables.exams.classId, id)),
    db.select().from(tables.results).where(eq(tables.results.classId, id)),
  ] as const);
  const subjects = subjectsRes.status === "fulfilled" ? (subjectsRes.value as any[]) : ([] as any[]);
  const students = studentsRes.status === "fulfilled" ? (studentsRes.value as any[]) : ([] as any[]);
  const exams = examsRes.status === "fulfilled" ? (examsRes.value as any[]) : ([] as any[]);
  const results = resultsRes.status === "fulfilled" ? (resultsRes.value as any[]) : ([] as any[]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-purple-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Status Messages */}
        {sp?.error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-gradient-to-r from-red-50 to-red-100 text-red-800 px-6 py-4 shadow-sm">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <span className="font-medium">{decodeURIComponent(sp.error)}</span>
            </div>
          </div>
        )}
        {sp?.saved === "1" && (
          <div className="mb-6 rounded-xl border border-emerald-200 bg-gradient-to-r from-emerald-50 to-green-100 text-emerald-800 px-6 py-4 shadow-sm">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              Saved successfully!
            </div>
          </div>
        )}

        {/* Header Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-emerald-600 to-purple-600 bg-clip-text text-transparent">
                  {klass.name}
                </h1>
                <p className="text-xl text-gray-600 mt-1">Section: {klass.section || 'Not specified'}</p>
              </div>
            </div>
            <a 
              href="/dashboard/classes" 
              className="inline-flex items-center gap-2 px-6 py-3 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-all duration-200 shadow-sm hover:shadow-md text-gray-700 font-medium"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to Classes
            </a>
          </div>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Subjects Card */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
            <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                  </div>
                  <h2 className="text-xl font-bold text-white">Subjects</h2>
                </div>
                <div className="flex items-center gap-2">
                  <a 
                    href={`/dashboard/subjects?classId=${encodeURIComponent(id)}`} 
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white rounded-lg transition-all duration-200 text-sm font-medium backdrop-blur-sm"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Add Subject
                  </a>
                  <a 
                    href="/dashboard/profile/settings" 
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-all duration-200 text-sm font-medium backdrop-blur-sm"
                    title="Rename subjects in Settings"
                  >
                    Manage Subjects
                  </a>
                </div>
              </div>
            </div>
            <div className="p-6">
              {subjects.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                  </div>
                  <p className="text-gray-500 text-lg">No subjects added yet</p>
                  <p className="text-gray-400 text-sm mt-1">Start by adding your first subject</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {(subjects as any[]).map((s) => (
                    <div key={s.id} className="bg-gray-50 rounded-xl p-3 hover:bg-gray-100 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
                            <svg className="w-4 h-4 text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </div>
                          <span className="font-medium text-gray-900">{s.name}</span>
                        </div>
                        <div className="flex items-center gap-2 ml-auto">
                          <form
                            action={async (formData) => {
                              "use server";
                              await deleteSubjectAction(formData);
                            }}
                          >
                            <input type="hidden" name="id" value={s.id} />
                            <input type="hidden" name="classId" value={id} />
                            <button 
                              type="submit" 
                              className="px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-medium transition-colors"
                            >
                              Delete
                            </button>
                          </form>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Students Card */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
            <div className="bg-gradient-to-r from-purple-500 to-purple-600 px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                    </svg>
                  </div>
                  <h2 className="text-xl font-bold text-white">Students</h2>
                </div>
                <a 
                  href={`/dashboard/students?classId=${encodeURIComponent(id)}`} 
                  className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-xl transition-all duration-200 font-medium backdrop-blur-sm"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add Student
                </a>
              </div>
            </div>
            <div className="p-6">
              {students.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                    </svg>
                  </div>
                  <p className="text-gray-500 text-lg">No students enrolled yet</p>
                  <p className="text-gray-400 text-sm mt-1">Add students to get started</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {(students as any[]).map((s) => (
                    <div key={s.id} className="bg-gray-50 rounded-xl p-4 hover:bg-gray-100 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                            <span className="text-purple-600 font-bold text-sm">{s.rollNo || '?'}</span>
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-900">{s.name}</h3>
                            <p className="text-sm text-gray-500">Roll: {s.rollNo} • Section: {s.section}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {/* View Button */}
                          <a
                            href={`/dashboard/students/${s.id}`}
                            className="inline-flex items-center px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium rounded-lg transition-all duration-200 shadow-sm hover:shadow-md"
                            title="View Student Details"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          </a>
                          
                          {/* Edit Button */}
                          <a
                            href={`/dashboard/students/${s.id}/edit`}
                            className="inline-flex items-center px-3 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium rounded-lg transition-all duration-200 shadow-sm hover:shadow-md"
                            title="Edit Student"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </a>
                          
                          {/* Results Button */}
                          <a
                            href={`/dashboard/students/${s.id}/results`}
                            className="inline-flex items-center px-3 py-2 bg-purple-500 hover:bg-purple-600 text-white text-sm font-medium rounded-lg transition-all duration-200 shadow-sm hover:shadow-md"
                            title="View Results"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                            </svg>
                          </a>
                          
                          {/* Delete Button */}
                          <form
                            action={deleteStudentAction}
                            className="inline"
                          >
                            <input type="hidden" name="id" value={s.id} />
                            <input type="hidden" name="classId" value={id} />
                            <button
                              type="submit"
                              className="inline-flex items-center px-3 py-2 bg-red-500 hover:bg-red-600 text-white text-sm font-medium rounded-lg transition-all duration-200 shadow-sm hover:shadow-md"
                              title="Delete Student"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </form>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Full Width Sections */}
        <div className="lg:col-span-2 space-y-8">
          {/* Exams Card */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
            <div className="bg-gradient-to-r from-blue-500 to-indigo-600 px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <h2 className="text-xl font-bold text-white">Exams</h2>
                </div>
                <a 
                  href={`/dashboard/exams?classId=${encodeURIComponent(id)}`} 
                  className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-xl transition-all duration-200 font-medium backdrop-blur-sm"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add Exam
                </a>
              </div>
            </div>
            <div className="p-6">
              {exams.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <p className="text-gray-500 text-lg">No exams scheduled yet</p>
                  <p className="text-gray-400 text-sm mt-1">Create your first exam to get started</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {(exams as any[]).map((e) => (
                    <div key={e.id} className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-100 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="font-semibold text-gray-900 text-lg">{e.name}</h3>
                          <p className="text-blue-600 font-medium">{e.term} • {e.year}</p>
                        </div>
                        <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                          <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <form
                          action={async (formData) => {
                            "use server";
                            await updateExamAction(formData);
                          }}
                          className="flex flex-wrap gap-2"
                        >
                          <input type="hidden" name="id" value={e.id} />
                          <input type="hidden" name="classId" value={id} />
                          <input 
                            name="name" 
                            defaultValue={e.name} 
                            placeholder="Exam name"
                            className="flex-1 min-w-32 px-3 py-1.5 border border-gray-200 rounded-lg bg-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" 
                          />
                          <input 
                            name="term" 
                            defaultValue={e.term} 
                            placeholder="Term"
                            className="w-24 px-3 py-1.5 border border-gray-200 rounded-lg bg-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" 
                          />
                          <input 
                            name="year" 
                            defaultValue={e.year} 
                            placeholder="Year"
                            className="w-20 px-3 py-1.5 border border-gray-200 rounded-lg bg-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" 
                          />
                          <button 
                            type="submit" 
                            className="px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-colors"
                          >
                            Update
                          </button>
                        </form>
                        <form
                          action={async (formData) => {
                            "use server";
                            await deleteExamAction(formData);
                          }}
                          className="inline"
                        >
                          <input type="hidden" name="id" value={e.id} />
                          <input type="hidden" name="classId" value={id} />
                          <button 
                            type="submit" 
                            className="px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-medium transition-colors"
                          >
                            Delete
                          </button>
                        </form>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Results Card */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
            <div className="bg-gradient-to-r from-green-500 to-emerald-600 px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  <h2 className="text-xl font-bold text-white">Results</h2>
                </div>
                <a 
                  href={`/dashboard/results?classId=${encodeURIComponent(id)}`} 
                  className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-xl transition-all duration-200 font-medium backdrop-blur-sm"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  View Reports
                </a>
              </div>
            </div>
            <div className="p-6">
              {results.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  <p className="text-gray-500 text-lg">No results computed yet</p>
                  <p className="text-gray-400 text-sm mt-1">Results will appear here after exams are graded</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Student</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Total</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Percentage</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Division</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Rank</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(() => {
                        const studentMap = new Map((students as any[]).map((s: any) => [s.id, s.name]));
                        const agg = new Map<string, { totalSum: number; percentSum: number; count: number; divisions: Record<string, number> }>();
                        for (const r of results as any[]) {
                          const stId = r.studentId as string;
                          const cur = agg.get(stId) ?? { totalSum: 0, percentSum: 0, count: 0, divisions: {} };
                          cur.totalSum += Number(r.total) || 0;
                          cur.percentSum += Number(r.percentage) || 0;
                          cur.count += 1;
                          const div = r.division as string | null;
                          if (div) cur.divisions[div] = (cur.divisions[div] ?? 0) + 1;
                          agg.set(stId, cur);
                        }
                        const rows = Array.from(agg.entries()).map(([studentId, v]) => {
                          const avgPercent = v.count ? v.percentSum / v.count : 0;
                          let division: string | null = null;
                          let maxC = 0;
                          for (const [d, c] of Object.entries(v.divisions)) {
                            if (c > maxC) { maxC = c; division = d; }
                          }
                          return { studentId, name: studentMap.get(studentId) ?? studentId, total: v.totalSum, percent: avgPercent, division };
                        });
                        rows.sort((a, b) => b.total - a.total);
                        let lastTotal: number | null = null;
                        let lastRank = 0;
                        let i = 0;
                        return rows.map((row) => {
                          i += 1;
                          if (lastTotal === null || row.total !== lastTotal) {
                            lastRank = i;
                            lastTotal = row.total;
                          }
                          return (
                            <tr key={row.studentId} className="border-b border-gray-100 hover:bg-gray-50">
                              <td className="py-3 px-4 font-medium text-gray-900">{row.name}</td>
                              <td className="py-3 px-4 text-gray-700">{row.total.toFixed(2)}</td>
                              <td className="py-3 px-4">
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                  row.percent >= 80 ? 'bg-green-100 text-green-800' :
                                  row.percent >= 60 ? 'bg-yellow-100 text-yellow-800' :
                                  'bg-red-100 text-red-800'
                                }`}>
                                  {row.percent.toFixed(1)}%
                                </span>
                              </td>
                              <td className="py-3 px-4 text-gray-700">{row.division ?? "—"}</td>
                              <td className="py-3 px-4">
                                <span className="inline-flex items-center justify-center w-8 h-8 bg-blue-100 text-blue-800 rounded-full text-sm font-bold">
                                  {lastRank}
                                </span>
                              </td>
                            </tr>
                          );
                        });
                      })()}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
