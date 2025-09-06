'use client';

interface Student {
  id: string;
  name: string;
  rollNo?: number | string;
  section?: string | null;
  classId?: string;
}

interface ClassInfo {
  id: string;
  name: string;
  section?: string | null;
}

// Matches fields selected in `page.tsx` for marks
interface StudentMark {
  id: string;
  obtained: number | null;
  converted?: number | null;
  examId: string | null;
  examName?: string | null;
  examTerm?: string | null;
  examYear?: number | null;
  subjectName?: string | null;
  subjectCode?: string | null;
  subjectPartName?: string | null;
  subjectPartType?: string | null;
  rawFullMark?: number | null;
  convertedFullMark?: number | null;
  // Exam-specific settings
  examFullMark?: number | null;
  examPassMark?: number | null;
  examHasConversion?: boolean | null;
  examConvertToMark?: number | null;
}

interface ExamGroup {
  examId: string | null;
  examName: string;
  examTerm?: string | null;
  examYear?: number | null;
  marks: StudentMark[];
}

interface StudentResultsClientProps {
  data: {
    student: Student;
    class: ClassInfo | null;
    marks: StudentMark[];
    examClassStats?: Record<string, { percentage: number; total: number; possible: number; rank: number; division: string; grade: string; classSize: number }>;
  };
}

export default function StudentResultsClient({ data }: StudentResultsClientProps) {
  const { student, class: studentClass, marks, examClassStats = {} } = data;

  // Group marks by exam
  const examGroups = marks.reduce((acc, mark) => {
    const examKey = mark.examId || 'no-exam';
    if (!acc[examKey]) {
      acc[examKey] = {
        examId: mark.examId ?? null,
        examName: mark.examName ?? 'Unknown Exam',
        examTerm: mark.examTerm ?? null,
        examYear: mark.examYear ?? null,
        marks: [],
      } as ExamGroup;
    }
    acc[examKey].marks.push(mark);
    return acc;
  }, {} as Record<string, ExamGroup>);

  const examResults: ExamGroup[] = Object.values(examGroups);

  // Pre-compute cumulative totals across ALL exams per subject (converted values)
  const cumulativeMap = marks.reduce((acc: Record<string, { subjectName: string; th: number; pr: number }>, mark: StudentMark) => {
    const subjectKey = mark.subjectCode || mark.subjectName || 'Unknown';
    if (!acc[subjectKey]) acc[subjectKey] = { subjectName: subjectKey, th: 0, pr: 0 };

    const obtained = mark.obtained || 0;
    const examFull = mark.examFullMark || mark.rawFullMark || 0;
    const convertTo = mark.examConvertToMark || mark.convertedFullMark || 0;
    const hasConv = !!mark.examHasConversion;
    const converted = hasConv && examFull > 0 ? parseFloat(((obtained / examFull) * convertTo).toFixed(1)) : obtained;

    const partType = (mark.subjectPartName || mark.subjectPartType || '').toLowerCase();
    const isTheory = partType.includes('theory') || partType.includes('th') || partType === 'theory';
    const isPractical = partType.includes('practical') || partType.includes('pr') || partType === 'practical';

    if (isTheory || (!isPractical && acc[subjectKey].th === 0)) acc[subjectKey].th += converted; else acc[subjectKey].pr += converted;
    return acc;
  }, {} as Record<string, { subjectName: string; th: number; pr: number }>);
  const cumulativeRows = Object.values(cumulativeMap).map((s) => ({ ...s, total: parseFloat((s.th + s.pr).toFixed(1)) }));

  // Calculate overall statistics
  const totalMarks = marks.reduce((sum, mark) => sum + (mark.obtained || 0), 0);
  const totalPossible = marks.reduce((sum, mark) => sum + (mark.convertedFullMark || 0), 0);
  const percentage = totalPossible > 0 ? ((totalMarks / totalPossible) * 100).toFixed(2) : '0';

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {/* Back Button */}
              <button
                onClick={() => window.history.back()}
                className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back to Student
              </button>
              
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                  {student.name}'s Results
                </h1>
                <div className="flex items-center gap-4 text-gray-600">
                  <span>Roll No: {student.rollNo}</span>
                  {studentClass && (
                    <span>Class: {studentClass.name} {studentClass.section}</span>
                  )}
                  {student.section && <span>Section: {student.section}</span>}
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-blue-600">{percentage}%</div>
              <div className="text-sm text-gray-500">Overall Performance</div>
            </div>
          </div>
        </div>

        {/* Overall Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-2xl font-bold text-green-600">{totalMarks}</div>
            <div className="text-gray-600">Total Marks Obtained</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-2xl font-bold text-blue-600">{totalPossible}</div>
            <div className="text-gray-600">Total Marks Possible</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-2xl font-bold text-purple-600">{examResults.length}</div>
            <div className="text-gray-600">Exams Taken</div>
          </div>
        </div>

        {/* All Exams Summary (exam-wise) */}
        {examResults.length > 0 && (
          <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">All Exams Summary</h3>
              <div className="text-sm text-gray-500">Totals | Percent | Rank | Division | Grade</div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {examResults.map((exam) => {
                const examTotal = exam.marks.reduce((sum: number, m: StudentMark) => sum + (m.obtained || 0), 0);
                const examPossible = exam.marks.reduce((sum: number, m: StudentMark) => sum + (m.convertedFullMark || 0), 0);
                const pct = examPossible > 0 ? (examTotal / examPossible) * 100 : 0;
                const stats = examClassStats[exam.examId ?? 'no-exam'];
                const showPct = stats ? stats.percentage : pct;
                const showTotal = stats ? stats.total : examTotal;
                const showPossible = stats ? stats.possible : examPossible;
                const showRank = stats?.rank;
                const showSize = stats?.classSize;
                const showDivision = stats?.division;
                const showGrade = stats?.grade;

                return (
                  <div key={exam.examId ?? exam.examName} className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-semibold text-amber-900">{exam.examName}</div>
                        <div className="text-xs text-amber-700 mt-1 flex gap-3">
                          {exam.examTerm && <span>Term: {exam.examTerm}</span>}
                          {typeof exam.examYear === 'number' && <span>Year: {exam.examYear}</span>}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xl font-extrabold text-amber-700">{showPct.toFixed(2)}%</div>
                        <div className="text-[11px] text-amber-700">{showTotal} / {showPossible}</div>
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
                      <span className="inline-flex items-center px-2 py-1 rounded bg-amber-100 text-amber-800 font-medium">{showRank ? `#${showRank}${showSize ? `/${showSize}` : ''}` : '—'}</span>
                      <span className="inline-flex items-center px-2 py-1 rounded bg-amber-100 text-amber-800 font-medium">{showDivision ?? '—'} Division</span>
                      <span className="inline-flex items-center px-2 py-1 rounded bg-amber-100 text-amber-800 font-bold">{showGrade ?? '—'} Grade</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Exam Results */}
        {examResults.length > 0 ? (
          <div className="space-y-6">
            {examResults.map((exam: ExamGroup) => {
              const examTotal = exam.marks.reduce((sum: number, mark: StudentMark) => sum + (mark.obtained || 0), 0);
              const examPossible = exam.marks.reduce((sum: number, mark: StudentMark) => sum + (mark.convertedFullMark || 0), 0);
              const examPercentage = examPossible > 0 ? ((examTotal / examPossible) * 100).toFixed(2) : '0';

              const statsKey = exam.examId ?? 'no-exam';
              const classStats = examClassStats[statsKey];

              return (
                <div key={exam.examId} className="bg-white rounded-xl shadow-lg overflow-hidden">
                  <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6">
                    <div className="flex justify-between items-center">
                      <div>
                        <h2 className="text-xl font-bold">{exam.examName || (exam.examTerm ? `${exam.examTerm} Exam` : 'Exam')}</h2>
                        <div className="flex items-center gap-4 mt-2 text-blue-100">
                          {exam.examTerm && <span>Term: {exam.examTerm}</span>}
                          {exam.examYear && <span>Year: {exam.examYear}</span>}
                        </div>
                      </div>
                      <div className="flex items-stretch gap-4">
                        {/* Class comparison green box (bigger) */}
                        <div className="bg-emerald-500 text-white rounded-xl px-6 py-4 shadow-lg min-w-[360px]">
                          <div className="text-[13px] font-semibold opacity-95">Class Comparison</div>
                          <div className="mt-2 flex items-end gap-4">
                            <div>
                              <div className="text-3xl leading-none font-extrabold">
                                {classStats ? classStats.percentage.toFixed(2) : examPercentage}%
                              </div>
                              <div className="text-[12px] opacity-95">
                                {classStats ? `${classStats.total} / ${classStats.possible}` : `${examTotal} / ${examPossible}`}
                              </div>
                            </div>
                            <div className="grid grid-cols-3 gap-3 text-center text-[12px]">
                              <div className="bg-white/15 rounded-md px-3 py-2">
                                <div className="font-semibold">{classStats ? `#${classStats.rank}` : '-'}</div>
                                <div className="opacity-95">Rank{classStats?.classSize ? `/${classStats.classSize}` : ''}</div>
                              </div>
                              <div className="bg-white/15 rounded-md px-3 py-2">
                                <div className="font-semibold">{classStats?.division ?? '-'}</div>
                                <div className="opacity-95">Division</div>
                              </div>
                              <div className="bg-white/15 rounded-md px-3 py-2">
                                <div className="font-semibold">{classStats?.grade ?? '-'}</div>
                                <div className="opacity-95">Grade</div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="p-6">
                    {/* All Exams (Cumulative) table inside exam section */}
                    <div className="mb-6">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-base font-semibold text-gray-900">All Exams Totals</h3>
                        <div className="text-xs text-gray-500">Subject-wise totals across all exams</div>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b-2 border-gray-300">
                              <th className="text-left py-3 px-2 font-semibold text-gray-700 border-r border-gray-200">Subject</th>
                              <th className="text-center py-3 px-2 font-semibold text-gray-700 border-r border-gray-200">Th. (All Exams)</th>
                              <th className="text-center py-3 px-2 font-semibold text-gray-700 border-r border-gray-200">Pr. (All Exams)</th>
                              <th className="text-center py-3 px-2 font-semibold text-gray-700">Total (Th + Pr)</th>
                            </tr>
                          </thead>
                          <tbody>
                            {cumulativeRows.map((row) => (
                              <tr key={row.subjectName} className="border-b border-gray-100 hover:bg-gray-50">
                                <td className="py-3 px-2 font-medium text-gray-900 border-r border-gray-200">{row.subjectName}</td>
                                <td className="py-3 px-2 text-center text-gray-900 border-r border-gray-200">{row.th}</td>
                                <td className="py-3 px-2 text-center text-gray-900 border-r border-gray-200">{row.pr}</td>
                                <td className="py-3 px-2 text-center font-bold text-gray-900">{row.total}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Removed per-exam detailed table per request */}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-lg p-12 text-center">
            <div className="text-gray-400 mb-4">
              <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-700 mb-2">No Results Found</h3>
            <p className="text-gray-500">
              This student doesn't have any exam results yet. Results will appear here once marks are entered.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function getGrade(percentage: number): string {
  if (percentage >= 90) return 'A+';
  if (percentage >= 80) return 'A';
  if (percentage >= 70) return 'B+';
  if (percentage >= 60) return 'B';
  if (percentage >= 50) return 'C+';
  if (percentage >= 40) return 'C';
  if (percentage >= 33) return 'D';
  return 'F';
}

function getGradeColor(grade: string): string {
  switch (grade) {
    case 'A+':
    case 'A':
      return 'bg-green-100 text-green-800';
    case 'B+':
    case 'B':
      return 'bg-blue-100 text-blue-800';
    case 'C+':
    case 'C':
      return 'bg-yellow-100 text-yellow-800';
    case 'D':
      return 'bg-orange-100 text-orange-800';
    case 'F':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}
