import { db, tables } from "@/db/client";
import { eq } from "drizzle-orm";
import ExamSubjectSettingsClient from "@/components/ExamSubjectSettingsClient";
import ExamSubjectPartSettingsClient from "@/components/ExamSubjectPartSettingsClient";

export default async function ExamSubjectSettingsPage({ 
  params, 
  searchParams 
}: { 
  params: Promise<{ id: string }>; 
  searchParams: Promise<{ saved?: string; error?: string }> 
}) {
  const pr = await params;
  const sp = await searchParams;
  const examId = pr.id;

  // Fetch exam details
  const examRows = await db.select().from(tables.exams).where(eq(tables.exams.id, examId)).limit(1);
  if (examRows.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-purple-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Exam Not Found</h2>
            <p className="text-gray-600 mb-6">The exam you're looking for doesn't exist or has been removed.</p>
            <a 
              href="/dashboard/exams" 
              className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-medium transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to Exams
            </a>
          </div>
        </div>
      </div>
    );
  }

  const exam = examRows[0] as any;

  // Fetch subjects for the exam's class
  let subjects: any[] = [];
  let subjectsAvailable = true;
  try {
    subjects = (await db
      .select()
      .from(tables.subjects)
      .where(eq(tables.subjects.classId, exam.classId))) as any[];
  } catch (e) {
    subjectsAvailable = false;
  }

  // Fetch existing subject-level settings for this exam
  let settings: any[] = [];
  let settingsAvailable = true;
  try {
    settings = (await db
      .select()
      .from(tables.examSubjectSettings)
      .where(eq(tables.examSubjectSettings.examId, examId))) as any[];
  } catch (e) {
    settingsAvailable = false;
  }

  // Fetch subject parts for all subjects and attach them to subjects
  const subjectIds = subjects.map((s: any) => s.id);
  let allParts: any[] = [];
  
  if (subjectIds.length > 0) {
    try {
      // Fetch all parts for all subjects at once
      for (const subjectId of subjectIds) {
        const parts = await db
          .select()
          .from(tables.subjectParts)
          .where(eq(tables.subjectParts.subjectId, subjectId));
        allParts.push(...parts);
      }
    } catch (e) {
      // If parts table doesn't exist, continue without parts
      allParts = [];
    }
  }

  // Attach parts to their respective subjects
  subjects.forEach((subject: any) => {
    subject.parts = allParts.filter((part: any) => part.subjectId === subject.id);
  });

  // Fetch existing per-part settings
  let partSettings: any[] = [];
  let partSettingsAvailable = true;
  try {
    partSettings = (await db
      .select()
      .from(tables.examSubjectPartSettings)
      .where(eq(tables.examSubjectPartSettings.examId, examId))) as any[];
  } catch (e) {
    partSettingsAvailable = false;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-purple-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header Section */}
        <section className="mb-10">
          <div className="flex items-center gap-4 mb-6">
            <a 
              href="/dashboard/exams" 
              className="inline-flex items-center gap-2 px-4 py-2 bg-white hover:bg-gray-50 border border-gray-200 rounded-xl font-medium transition-colors shadow-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to Exams
            </a>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-emerald-600 to-purple-600 bg-clip-text text-transparent">
                Subject Settings
              </h1>
              <p className="text-xl text-gray-600 mt-1">Configure marks and conversion settings for {exam.name}</p>
            </div>
          </div>
        </section>

        {/* Status Messages */}
        {(sp?.saved === "1" || sp?.error || !subjectsAvailable || !settingsAvailable || !partSettingsAvailable) && (
          <section className="mb-8 space-y-4">
            {sp?.saved === "1" && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <p className="text-green-800 font-medium">Settings saved successfully!</p>
                </div>
              </div>
            )}

            {sp?.error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <p className="text-red-800 font-medium">{decodeURIComponent(sp.error)}</p>
                </div>
              </div>
            )}

            {!subjectsAvailable && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <svg className="w-4 h-4 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-yellow-800 font-medium mb-1">Subjects Not Available</p>
                    <p className="text-yellow-700 text-sm">Could not load subjects for this class. Your database may be missing the latest migrations. Please run the migration files in <code className="bg-yellow-100 px-1 rounded">drizzle/</code> and reload this page.</p>
                  </div>
                </div>
              </div>
            )}

            {!settingsAvailable && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <svg className="w-4 h-4 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-yellow-800 font-medium mb-1">Settings Table Missing</p>
                    <p className="text-yellow-700 text-sm">The table "exam_subject_settings" hasn't been created yet. Please run the migration file at <code className="bg-yellow-100 px-1 rounded">drizzle/0002_add_exam_subject_settings.sql</code> and reload this page.</p>
                  </div>
                </div>
              </div>
            )}

            {!partSettingsAvailable && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <svg className="w-4 h-4 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-yellow-800 font-medium mb-1">Part Settings Table Missing</p>
                    <p className="text-yellow-700 text-sm">The table "exam_subject_part_settings" hasn't been created yet. Please run the migration and reload this page.</p>
                  </div>
                </div>
              </div>
            )}
          </section>
        )}

        {/* Main Content */}
        <ExamSubjectSettingsClient
          examId={examId}
          subjects={subjects as any[]}
          settings={settings as any[]}
          partSettings={partSettings as any[]}
        />

        {/* Info Section */}
        <section className="mt-8">
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <p className="text-blue-800 font-medium mb-1">Configuration Notes</p>
                <p className="text-blue-700 text-sm">The subject will use exam-specific marks set here. Leave blank to rely on class defaults. Changes are saved individually or use "Save All Changes" to update all subjects at once.</p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}