"use client";

import { useRouter } from "next/navigation";

interface FlexibleMarksSelectorProps {
  subjects: Array<{
    id: string;
    name: string;
    code?: string | null;
  }>;
  students: Array<{
    studentId: string;
    name: string;
    rollNo: number;
  }>;
  selectedSubjectId?: string;
  selectedStudentId?: string;
  examId: string;
}

export default function FlexibleMarksSelectors({
  subjects,
  students,
  selectedSubjectId,
  selectedStudentId,
  examId,
}: FlexibleMarksSelectorProps) {
  const router = useRouter();

  const handleSubjectChange = (newSubjectId: string) => {
    const params = new URLSearchParams();
    params.set('subjectId', newSubjectId);
    if (selectedStudentId) {
      params.set('studentId', selectedStudentId);
    }
    router.push(`/dashboard/exams/${examId}/flexible-marks?${params.toString()}`);
  };

  const handleStudentChange = (newStudentId: string) => {
    const params = new URLSearchParams();
    if (selectedSubjectId) {
      params.set('subjectId', selectedSubjectId);
    }
    params.set('studentId', newStudentId);
    router.push(`/dashboard/exams/${examId}/flexible-marks?${params.toString()}`);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <label className="block text-sm font-medium mb-2">Select Subject</label>
        <select
          value={selectedSubjectId || ""}
          onChange={(e) => handleSubjectChange(e.target.value)}
          className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Select a subject...</option>
          {subjects.map((subject) => (
            <option key={subject.id} value={subject.id}>
              {subject.code ? `${subject.code} - ${subject.name}` : subject.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Select Student</label>
        <select
          value={selectedStudentId || ""}
          onChange={(e) => handleStudentChange(e.target.value)}
          className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Select a student...</option>
          {students.map((student) => (
            <option key={student.studentId} value={student.studentId}>
              Roll {student.rollNo} - {student.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
