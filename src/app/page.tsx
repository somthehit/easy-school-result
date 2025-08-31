export default function Home() {
  return (
    <div className="space-y-16">
      {/* Hero */}
      <section className="text-center py-10 sm:py-16">
        <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight">Simple, Shareable School Results</h1>
        <p className="mt-4 text-neutral-600 dark:text-neutral-400 max-w-2xl mx-auto">
          Publish exam results with grades, percentages and ranks. Share a secure link with students and parents.
        </p>
        <div className="mt-8 flex items-center justify-center gap-3">
          <a href="/public-result" className="px-5 py-3 rounded-md bg-blue-600 text-white hover:bg-blue-700">Check Result</a>
          <a href="/dashboard" className="px-5 py-3 rounded-md border border-sky-300 dark:border-emerald-600 hover:bg-sky-50 dark:hover:bg-emerald-900/30 transition-colors">Go to Dashboard</a>
        </div>
      </section>

      {/* Features */}
      <section className="grid sm:grid-cols-3 gap-6">
        <div className="rounded-lg border p-5">
          <h3 className="font-medium">Publish</h3>
          <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">Compute totals and grades, then publish results with one click.</p>
        </div>
        <div className="rounded-lg border p-5">
          <h3 className="font-medium">Share</h3>
          <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">Each result gets a unique tokenized link to share securely.</p>
        </div>
        <div className="rounded-lg border p-5">
          <h3 className="font-medium">Insights</h3>
          <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">Ranks, percentages and divisions at a glance.</p>
        </div>
      </section>
    </div>
  );
}
