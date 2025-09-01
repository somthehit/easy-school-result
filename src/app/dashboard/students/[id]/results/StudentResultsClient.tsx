'use client';

interface StudentResultsClientProps {
  data: {
    student: any;
    class: any;
    marks: any[];
  };
}

export default function StudentResultsClient({ data }: StudentResultsClientProps) {
  const { student, class: studentClass, marks } = data;

  // Group marks by exam
  const examGroups = marks.reduce((acc, mark) => {
    const examKey = mark.examId || 'no-exam';
    if (!acc[examKey]) {
      acc[examKey] = {
        examId: mark.examId,
        examName: mark.examName || 'Unknown Exam',
        examTerm: mark.examTerm,
        examYear: mark.examYear,
        marks: [],
      };
    }
    acc[examKey].marks.push(mark);
    return acc;
  }, {} as Record<string, any>);

  const examResults = Object.values(examGroups);

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

        {/* Exam Results */}
        {examResults.length > 0 ? (
          <div className="space-y-6">
            {examResults.map((exam) => {
              const examTotal = exam.marks.reduce((sum: number, mark: any) => sum + (mark.obtained || 0), 0);
              const examPossible = exam.marks.reduce((sum: number, mark: any) => sum + (mark.convertedFullMark || 0), 0);
              const examPercentage = examPossible > 0 ? ((examTotal / examPossible) * 100).toFixed(2) : '0';

              return (
                <div key={exam.examId} className="bg-white rounded-xl shadow-lg overflow-hidden">
                  <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6">
                    <div className="flex justify-between items-center">
                      <div>
                        <h2 className="text-xl font-bold">{exam.examName}</h2>
                        <div className="flex items-center gap-4 mt-2 text-blue-100">
                          {exam.examTerm && <span>Term: {exam.examTerm}</span>}
                          {exam.examYear && <span>Year: {exam.examYear}</span>}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold">{examPercentage}%</div>
                        <div className="text-blue-100">
                          {examTotal} / {examPossible}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="p-6">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-gray-200">
                            <th className="text-left py-3 px-4 font-semibold text-gray-700">Subject</th>
                            <th className="text-left py-3 px-4 font-semibold text-gray-700">Part</th>
                            <th className="text-center py-3 px-4 font-semibold text-gray-700">Obtained</th>
                            <th className="text-center py-3 px-4 font-semibold text-gray-700">Total</th>
                            <th className="text-center py-3 px-4 font-semibold text-gray-700">Percentage</th>
                            <th className="text-center py-3 px-4 font-semibold text-gray-700">Grade</th>
                          </tr>
                        </thead>
                        <tbody>
                          {exam.marks.map((mark: any) => {
                            const markPercentage = mark.convertedFullMark > 0 ? ((mark.obtained / mark.convertedFullMark) * 100).toFixed(1) : '0';
                            const grade = getGrade(parseFloat(markPercentage));
                            
                            return (
                              <tr key={mark.id} className="border-b border-gray-100 hover:bg-gray-50">
                                <td className="py-3 px-4">{mark.subjectCode || mark.subjectName}</td>
                                <td className="py-3 px-4 capitalize">{mark.subjectPartName || mark.subjectPartType || 'N/A'}</td>
                                <td className="py-3 px-4 text-center font-semibold">{mark.obtained || 0}</td>
                                <td className="py-3 px-4 text-center">{mark.convertedFullMark || 0}</td>
                                <td className="py-3 px-4 text-center">{markPercentage}%</td>
                                <td className="py-3 px-4 text-center">
                                  <span className={`px-2 py-1 rounded text-sm font-semibold ${getGradeColor(grade)}`}>
                                    {grade}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
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
