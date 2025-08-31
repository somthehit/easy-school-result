import { getDashboardData, createExam, recomputeExamAction, togglePublishAction } from "../actions";

export const dynamic = "force-dynamic";

export default async function ExamsPage({ searchParams }: { searchParams: Promise<{ classId?: string; q?: string; notice?: string; error?: string }> }) {
  const { classes, exams } = await getDashboardData();
  const classMap = new Map((classes as any[]).map((c) => [c.id, `${c.name} - ${c.section}`]));
  const sp = await searchParams;
  const defaultClassId = sp?.classId ?? "";
  const q = (sp?.q ?? "").toLowerCase();
  const notice = sp?.notice;
  const error = sp?.error ? decodeURIComponent(sp.error) : "";
  let filtered = defaultClassId ? (exams as any[]).filter((e) => e.classId === defaultClassId) : (exams as any[]);
  if (q) filtered = filtered.filter((e) => String(e.name).toLowerCase().includes(q) || String(e.term ?? "").toLowerCase().includes(q) || String(e.year ?? "").includes(q));

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Manage Exams</h1>
          
          {/* Success Messages */}
          {notice && (
            <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-800 px-4 py-3 text-sm font-medium">
              {notice === "created" && "✅ Exam created successfully!"}
              {notice === "recomputed" && "🔄 Results recomputed for the exam."}
              {notice === "published" && "📢 Results published successfully."}
              {notice === "unpublished" && "📝 Results unpublished."}
            </div>
          )}

          {/* Error Messages */}
          {error && (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 text-red-800 px-4 py-3 text-sm font-medium">
              ❌ {error}
            </div>
          )}
        </div>

        {/* Back Button */}
        <div className="mb-8">
          <a href="/dashboard" className="inline-flex items-center gap-2 px-4 py-2 bg-white rounded-xl border border-gray-200 hover:bg-gray-50 transition-all duration-200 shadow-sm hover:shadow-md">
            <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span className="text-gray-700 font-medium">Back to Dashboard</span>
          </a>
        </div>

        {/* Create Exam Section */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden mb-8">
          <div className="bg-gradient-to-r from-purple-500 to-purple-600 px-6 py-4">
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
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-white">Create Exam</h2>
            </div>
          </div>
          <div className="p-6">
            <form action={createExam} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-700">Exam Name</label>
                  <input 
                    name="name" 
                    placeholder="e.g., Final Exam" 
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 bg-white focus:border-purple-500 focus:ring-1 focus:ring-purple-200 transition-all duration-200 text-sm" 
                    required 
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-700">Term</label>
                  <input 
                    name="term" 
                    placeholder="e.g., First Term" 
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 bg-white focus:border-purple-500 focus:ring-1 focus:ring-purple-200 transition-all duration-200 text-sm" 
                    required 
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-700">Year</label>
                  <input 
                    name="year" 
                    type="number" 
                    placeholder="2024" 
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 bg-white focus:border-purple-500 focus:ring-1 focus:ring-purple-200 transition-all duration-200 text-sm" 
                    min={1900} 
                    required 
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-700">Class</label>
                  <select 
                    name="classId" 
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 bg-white focus:border-purple-500 focus:ring-1 focus:ring-purple-200 transition-all duration-200 text-sm" 
                    defaultValue={defaultClassId} 
                    required
                  >
                    <option value="">Select Class</option>
                    {classes.map((c: any) => (
                      <option key={c.id} value={c.id}>
                        {c.name} - {c.section}
                      </option>
                    ))}
                  </select>
                </div>
                <button 
                  type="submit" 
                  className="px-6 py-2 bg-purple-500 hover:bg-purple-600 text-white font-medium rounded-lg transition-all duration-200 shadow-sm hover:shadow-md flex items-center justify-center gap-2 text-sm"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Exams List Section */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
          <div className="bg-gradient-to-r from-indigo-500 to-indigo-600 px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-white">All Exams</h2>
            </div>
          </div>
          <div className="p-6">
            {/* Filters */}
            <form method="get" className="mb-6 bg-gray-50 rounded-xl p-4 border border-gray-100">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Filter by Class</label>
                  <select 
                    name="classId" 
                    defaultValue={defaultClassId} 
                    className="w-full rounded-xl border border-gray-200 px-4 py-3 bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all duration-200"
                  >
                    <option value="">All Classes</option>
                    {(classes as any[]).map((c: any) => (
                      <option key={c.id} value={c.id}>{c.name} - {c.section ?? 'No Section'}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Search Exams</label>
                  <input 
                    name="q" 
                    defaultValue={q} 
                    placeholder="Name, term or year" 
                    className="w-full rounded-xl border border-gray-200 px-4 py-3 bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all duration-200" 
                  />
                </div>
                <div className="flex items-end">
                  <button 
                    type="submit" 
                    className="w-full px-6 py-3 bg-indigo-500 hover:bg-indigo-600 text-white font-medium rounded-xl transition-all duration-200 shadow-sm hover:shadow-md flex items-center justify-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    Apply Filters
                  </button>
                </div>
              </div>
            </form>

            {/* Exams Table */}
            {filtered.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <p className="text-gray-500 text-lg font-medium">No exams found</p>
                <p className="text-gray-400 mt-1">Create your first exam to get started</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-4 px-4 font-semibold text-gray-700">Exam Details</th>
                      <th className="text-left py-4 px-4 font-semibold text-gray-700">Class</th>
                      <th className="text-left py-4 px-4 font-semibold text-gray-700">Results</th>
                      <th className="text-left py-4 px-4 font-semibold text-gray-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((e: any) => (
                      <tr key={e.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                        <td className="py-4 px-4">
                          <div>
                            <p className="font-medium text-gray-900">{e.name}</p>
                            <p className="text-sm text-gray-500">{e.term} • {e.year}</p>
                          </div>
                        </td>
                        <td className="py-4 px-4 text-gray-700">{classMap.get(e.classId) ?? '-'}</td>
                        <td className="py-4 px-4">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {e.resultCount} results
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex flex-wrap gap-2">
                            <a
                              href={`/dashboard/exams/${e.id}/marks`}
                              className="inline-flex items-center px-3 py-1.5 bg-purple-500 hover:bg-purple-600 text-white font-medium rounded-lg transition-all duration-200 text-xs"
                            >
                              Enter Marks
                            </a>
                            <a
                              href={`/dashboard/exams/${e.id}/settings`}
                              className="inline-flex items-center px-3 py-1.5 bg-gray-500 hover:bg-gray-600 text-white font-medium rounded-lg transition-all duration-200 text-xs"
                            >
                              Settings
                            </a>
                            <form action={recomputeExamAction} className="inline">
                              <input type="hidden" name="examId" value={e.id} />
                              <button className="px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white font-medium rounded-lg transition-all duration-200 text-xs">
                                Recompute
                              </button>
                            </form>
                            <form action={togglePublishAction} className="inline">
                              <input type="hidden" name="examId" value={e.id} />
                              <input type="hidden" name="publish" value="true" />
                              <button className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white font-medium rounded-lg transition-all duration-200 text-xs">
                                Publish
                              </button>
                            </form>
                            <form action={togglePublishAction} className="inline">
                              <input type="hidden" name="examId" value={e.id} />
                              <input type="hidden" name="publish" value="false" />
                              <button className="px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white font-medium rounded-lg transition-all duration-200 text-xs">
                                Unpublish
                              </button>
                            </form>
                            <a
                              href={`/dashboard/results?year=${encodeURIComponent(e.year)}&classId=${encodeURIComponent(e.classId)}&examId=${encodeURIComponent(e.id)}`}
                              className="inline-flex items-center px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-lg transition-all duration-200 text-xs"
                              title="View Results (preselected)"
                            >
                              View Results
                            </a>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
