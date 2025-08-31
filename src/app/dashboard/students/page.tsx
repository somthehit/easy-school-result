import { getStudentsData, createStudent } from "./actions";
import ClassSelectWithSection from "@/components/ClassSelectWithSection";
import StudentsPageClient from "./StudentsPageClient";

export const dynamic = "force-dynamic";

export default async function StudentsPage({ searchParams }: { searchParams: Promise<{ classId?: string; q?: string; saved?: string; error?: string }> }) {
  const sp = await searchParams;
  const { classes, students } = await getStudentsData();
  const classMap = new Map((classes as any[]).map((c) => [c.id, `${c.name} - ${c.section}`]));
  const defaultClassId = sp?.classId ?? "";
  const q = (sp?.q ?? "").toLowerCase();
  let filtered = defaultClassId ? (students as any[]).filter((s) => s.classId === defaultClassId) : (students as any[]);
  if (q) filtered = filtered.filter((s) => String(s.name).toLowerCase().includes(q));
  const saved = sp?.saved === "1";

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-blue-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header Section */}
        <div className="flex items-center gap-4 mb-8">
          <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
            </svg>
          </div>
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-emerald-600 to-blue-600 bg-clip-text text-transparent">Students</h1>
            <p className="text-gray-600 mt-1">Manage student enrollment and information</p>
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
        {saved && (
          <div className="mb-6 p-4 rounded-xl bg-green-50 border border-green-200 flex items-center gap-3">
            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
              <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            </div>
            <p className="text-green-800 font-medium">Student added successfully!</p>
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

        {/* Add Student Section */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden mb-8">
          <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-white">Add Student</h2>
            </div>
          </div>
          <div className="p-6">
            <form action={createStudent} className="space-y-4">
              {/* Basic Information */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-700">Full Name</label>
                  <input 
                    name="name" 
                    required 
                    placeholder="Enter student's full name" 
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 bg-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-200 transition-all duration-200 text-sm" 
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-700">Roll Number</label>
                  <input 
                    name="rollNo" 
                    type="number" 
                    required 
                    min={1} 
                    placeholder="Enter roll number" 
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 bg-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-200 transition-all duration-200 text-sm" 
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-700">Gender</label>
                  <select 
                    name="gender" 
                    required 
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 bg-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-200 transition-all duration-200 text-sm"
                  >
                    <option value="">Select gender</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                  </select>
                </div>
              </div>

              {/* Class, Section, and DOB */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="md:col-span-2">
                  <ClassSelectWithSection
                    classes={classes as any}
                    defaultClassId={defaultClassId}
                    classSelectName="classId"
                    sectionInputName="section"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-700">Date of Birth</label>
                  <input 
                    name="dob" 
                    type="date" 
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 bg-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-200 transition-all duration-200 text-sm" 
                  />
                </div>
              </div>

              {/* Contact and Parent Info */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-700">Contact Number</label>
                  <input 
                    name="contact" 
                    placeholder="Enter contact number" 
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 bg-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-200 transition-all duration-200 text-sm" 
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-700">Father's Name</label>
                  <input 
                    name="fathersName" 
                    placeholder="Enter father's name" 
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 bg-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-200 transition-all duration-200 text-sm" 
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-700">Mother's Name</label>
                  <input 
                    name="mothersName" 
                    placeholder="Enter mother's name" 
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 bg-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-200 transition-all duration-200 text-sm" 
                  />
                </div>
              </div>

              {/* Guardian and Photo */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-700">Parent/Guardian</label>
                  <input 
                    name="parentName" 
                    placeholder="Enter parent/guardian name" 
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 bg-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-200 transition-all duration-200 text-sm" 
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-700">Photo File</label>
                  <input 
                    type="file" 
                    name="photoFile" 
                    accept="image/*" 
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 bg-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-200 transition-all duration-200 text-sm" 
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-700">Photo URL</label>
                  <input 
                    name="photoUrl" 
                    placeholder="https://example.com/photo.jpg" 
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 bg-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-200 transition-all duration-200 text-sm" 
                  />
                </div>
              </div>

              {/* Address and Submit */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
                <div className="md:col-span-3 space-y-1">
                  <label className="text-xs font-medium text-gray-700">Address</label>
                  <input 
                    name="address" 
                    placeholder="Enter complete address" 
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 bg-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-200 transition-all duration-200 text-sm" 
                  />
                </div>
                <button 
                  type="submit" 
                  className="px-6 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-medium rounded-lg transition-all duration-200 shadow-sm hover:shadow-md flex items-center justify-center gap-2 text-sm"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add Student
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Students List Section */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                </div>
                <h2 className="text-xl font-bold text-white">{defaultClassId ? `Students in ${classMap.get(defaultClassId) ?? "Selected Class"}` : "All Students"}</h2>
              </div>
              <StudentsPageClient classes={classes} defaultClassId={defaultClassId} />
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
                    className="w-full rounded-xl border border-gray-200 px-4 py-3 bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200"
                  >
                    <option value="">All Classes</option>
                    {(classes as any[]).map((c: any) => (
                      <option key={c.id} value={c.id}>{c.name} - {c.section ?? 'No Section'}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Search by Name</label>
                  <input 
                    name="q" 
                    defaultValue={q} 
                    placeholder="e.g., John Doe" 
                    className="w-full rounded-xl border border-gray-200 px-4 py-3 bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200" 
                  />
                </div>
                <div className="flex items-end">
                  <button 
                    type="submit" 
                    className="w-full px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-xl transition-all duration-200 shadow-sm hover:shadow-md flex items-center justify-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    Apply Filters
                  </button>
                </div>
              </div>
            </form>

            {/* Students Table */}
            {filtered.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                  </svg>
                </div>
                <p className="text-gray-500 text-lg font-medium">No students found</p>
                <p className="text-gray-400 mt-1">Add your first student to get started</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-4 px-4 font-semibold text-gray-700">Student</th>
                      <th className="text-left py-4 px-4 font-semibold text-gray-700">Roll No</th>
                      <th className="text-left py-4 px-4 font-semibold text-gray-700">Class</th>
                      <th className="text-left py-4 px-4 font-semibold text-gray-700">Section</th>
                      <th className="text-left py-4 px-4 font-semibold text-gray-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((s: any) => (
                      <tr key={s.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-3">
                            {s.photoUrl ? (
                              <img 
                                src={s.photoUrl} 
                                alt={s.name} 
                                className="w-10 h-10 rounded-full object-cover border-2 border-gray-200"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-blue-500 flex items-center justify-center">
                                <span className="text-sm font-bold text-white">
                                  {s.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()}
                                </span>
                              </div>
                            )}
                            <div>
                              <p className="font-medium text-gray-900">{s.name}</p>
                              <p className="text-sm text-gray-500">{s.gender}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-4 text-gray-700">{s.rollNo}</td>
                        <td className="py-4 px-4 text-gray-700">{classMap.get(s.classId) ?? '-'}</td>
                        <td className="py-4 px-4 text-gray-700">{s.section || 'N/A'}</td>
                        <td className="py-4 px-4">
                          <a
                            href={`/dashboard/students/${s.id}`}
                            className="inline-flex items-center px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-xl transition-all duration-200 shadow-sm hover:shadow-md"
                          >
                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                            View
                          </a>
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
