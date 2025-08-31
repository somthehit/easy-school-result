export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  return (
    <main className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-md px-6 py-12">
        <div className="rounded-lg bg-white px-6 py-8 shadow">
          <div className="mb-8 text-center">
            <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
            <p className="mt-2 text-sm text-gray-600">
              Manage your school's exam results and data
            </p>
          </div>

          <div className="space-y-4">
            <a
              href="/dashboard/classes"
              className="block w-full rounded-md bg-emerald-500 px-4 py-2.5 text-center font-medium text-white hover:bg-emerald-600 transition-colors"
            >
              Manage Classes
            </a>
            
            <a
              href="/dashboard/subjects"
              className="block w-full rounded-md bg-blue-500 px-4 py-2.5 text-center font-medium text-white hover:bg-blue-600 transition-colors"
            >
              Manage Subjects
            </a>
            
            <a
              href="/dashboard/students"
              className="block w-full rounded-md bg-purple-500 px-4 py-2.5 text-center font-medium text-white hover:bg-purple-600 transition-colors"
            >
              Manage Students
            </a>
            
            <a
              href="/dashboard/exams"
              className="block w-full rounded-md bg-orange-500 px-4 py-2.5 text-center font-medium text-white hover:bg-orange-600 transition-colors"
            >
              Manage Exams
            </a>
            
            <a
              href="/dashboard/results"
              className="block w-full rounded-md bg-indigo-500 px-4 py-2.5 text-center font-medium text-white hover:bg-indigo-600 transition-colors"
            >
              View Results
            </a>
          </div>

          <div className="mt-8 rounded-md bg-gray-50 p-4">
            <h3 className="text-sm font-medium text-gray-900 mb-2">Quick Tips</h3>
            <ul className="text-xs text-gray-600 space-y-1">
              <li>• Recompute updates marks and student results</li>
              <li>• Publishing generates share tokens for results</li>
              <li>• Create classes first, then add subjects and students</li>
            </ul>
          </div>
        </div>
      </div>
    </main>
  );
}
