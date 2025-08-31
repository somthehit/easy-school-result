"use client";

import { useState } from "react";
import LoadingButton from "./LoadingButton";

interface MarksEntryFormProps {
  students: any[];
  subjects: any[];
  onSubmit: (formData: FormData) => Promise<any>;
  examId: string;
}

export default function MarksEntryForm({ 
  students, 
  subjects, 
  onSubmit,
  examId
}: MarksEntryFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const formData = new FormData(e.currentTarget);
      formData.append("examId", examId);
      formData.append("subjectId", selectedSubject);
      
      const result = await onSubmit(formData);
      
      if (result?.error) {
        setError(result.error);
      }
    } catch (err: any) {
      setError(err.message || "Failed to save marks");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
            <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <div>
            <h3 className="font-medium text-blue-900">Select Subject</h3>
            <p className="text-sm text-blue-700">Choose the subject to enter marks for</p>
          </div>
        </div>
        
        <select
          value={selectedSubject}
          onChange={(e) => setSelectedSubject(e.target.value)}
          required
          className="w-full rounded-xl border border-blue-200 px-4 py-3 bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200"
        >
          <option value="">Select Subject</option>
          {subjects.map((subject) => (
            <option key={subject.id} value={subject.id}>
              {subject.name}
            </option>
          ))}
        </select>
      </div>

      {selectedSubject && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
            <h3 className="font-medium text-gray-900">Enter Marks</h3>
          </div>
          
          <div className="p-6">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Roll No.</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Student Name</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Theory Marks</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Practical Marks</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((student, index) => (
                    <tr key={student.id} className="border-b border-gray-100">
                      <td className="py-3 px-4 text-sm text-gray-600">{student.rollNumber}</td>
                      <td className="py-3 px-4 font-medium text-gray-900">{student.name}</td>
                      <td className="py-3 px-4">
                        <input
                          name={`theory_${student.id}`}
                          type="number"
                          min="0"
                          max="100"
                          step="0.01"
                          placeholder="0"
                          className="w-20 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-200"
                        />
                      </td>
                      <td className="py-3 px-4">
                        <input
                          name={`practical_${student.id}`}
                          type="number"
                          min="0"
                          max="100"
                          step="0.01"
                          placeholder="0"
                          className="w-20 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-200"
                        />
                      </td>
                      <td className="py-3 px-4">
                        <input
                          name={`total_${student.id}`}
                          type="number"
                          min="0"
                          max="200"
                          step="0.01"
                          placeholder="0"
                          className="w-20 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-200"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      {selectedSubject && (
        <div className="flex justify-end">
          <LoadingButton
            type="submit"
            isLoading={isLoading}
            className="px-8 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-medium rounded-xl transition-all duration-200 shadow-sm hover:shadow-md"
          >
            Save Marks
          </LoadingButton>
        </div>
      )}
    </form>
  );
}
