"use client";

import { useState, useEffect } from "react";
import { 
  calculateSubjectResult, 
  calculatePartResult,
  validatePartMark,
  PART_TYPES,
  type Subject,
  type SubjectPart,
  type PartMark 
} from "@/lib/marks-calculator";

interface FlexibleMarksEntryProps {
  examId: string;
  students: Array<{
    id: string;
    name: string;
    rollNo: number;
  }>;
  subjects: Subject[];
  onSave: (studentId: string, marks: PartMark[]) => Promise<void>;
}

export default function FlexibleMarksEntry({ 
  examId, 
  students, 
  subjects, 
  onSave 
}: FlexibleMarksEntryProps) {
  const [selectedStudent, setSelectedStudent] = useState<string>("");
  const [marks, setMarks] = useState<Record<string, number>>({});
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [saving, setSaving] = useState(false);
  const [results, setResults] = useState<Record<string, any>>({});

  // Calculate results when marks change
  useEffect(() => {
    if (!selectedStudent) return;

    const newResults: Record<string, any> = {};
    
    subjects.forEach(subject => {
      const partMarks: PartMark[] = subject.parts
        .filter(part => part.isActive)
        .map(part => ({
          partId: part.id,
          obtainedRawMark: marks[`${selectedStudent}-${part.id}`] || 0,
        }));

      if (partMarks.some(pm => pm.obtainedRawMark > 0)) {
        const result = calculateSubjectResult(subject, partMarks);
        newResults[subject.id] = result;
      }
    });

    setResults(newResults);
  }, [marks, selectedStudent, subjects]);

  const handleMarkChange = (studentId: string, partId: string, value: string) => {
    const numValue = parseFloat(value) || 0;
    const key = `${studentId}-${partId}`;
    
    setMarks(prev => ({
      ...prev,
      [key]: numValue
    }));

    // Validate the mark
    const part = subjects
      .flatMap(s => s.parts)
      .find(p => p.id === partId);
    
    if (part) {
      const validation = validatePartMark(part, numValue);
      setErrors(prev => ({
        ...prev,
        [key]: validation.errors
      }));
    }
  };

  const handleSave = async () => {
    if (!selectedStudent) return;

    setSaving(true);
    try {
      const studentMarks: PartMark[] = [];
      
      subjects.forEach(subject => {
        subject.parts
          .filter(part => part.isActive)
          .forEach(part => {
            const key = `${selectedStudent}-${part.id}`;
            const obtainedRawMark = marks[key] || 0;
            
            if (obtainedRawMark > 0) {
              studentMarks.push({
                partId: part.id,
                obtainedRawMark,
              });
            }
          });
      });

      await onSave(selectedStudent, studentMarks);
      
      // Clear marks after successful save
      const clearedMarks = { ...marks };
      Object.keys(clearedMarks).forEach(key => {
        if (key.startsWith(selectedStudent)) {
          delete clearedMarks[key];
        }
      });
      setMarks(clearedMarks);
      setResults({});
      
    } catch (error) {
      console.error('Failed to save marks:', error);
    } finally {
      setSaving(false);
    }
  };

  const selectedStudentData = students.find(s => s.id === selectedStudent);

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
      <div className="bg-gradient-to-r from-blue-500 to-indigo-600 px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-white">Flexible Marks Entry</h2>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Student Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Student
          </label>
          <select
            value={selectedStudent}
            onChange={(e) => setSelectedStudent(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-xl bg-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          >
            <option value="">Choose a student...</option>
            {students.map(student => (
              <option key={student.id} value={student.id}>
                Roll {student.rollNo} - {student.name}
              </option>
            ))}
          </select>
        </div>

        {selectedStudent && (
          <>
            {/* Marks Entry Grid */}
            <div className="space-y-6">
              {subjects.map(subject => (
                <div key={subject.id} className="border border-gray-200 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        {subject.name}
                        {subject.code && (
                          <span className="ml-2 text-sm text-gray-500">({subject.code})</span>
                        )}
                      </h3>
                      <p className="text-sm text-gray-600">
                        Credit Hours: {subject.creditHours} | Default: {subject.defaultFullMark} marks
                      </p>
                    </div>
                    {results[subject.id] && (
                      <div className="text-right">
                        <div className="text-lg font-bold text-gray-900">
                          {results[subject.id].totalConvertedMark.toFixed(1)}/{results[subject.id].totalFullMark}
                        </div>
                        <div className="text-sm text-gray-600">
                          {results[subject.id].percentage.toFixed(1)}% • {results[subject.id].grade}
                        </div>
                        <div className={`text-xs font-medium ${
                          results[subject.id].isPassed ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {results[subject.id].isPassed ? 'PASS' : 'FAIL'}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {subject.parts
                      .filter(part => part.isActive)
                      .sort((a, b) => a.sortOrder - b.sortOrder)
                      .map(part => {
                        const key = `${selectedStudent}-${part.id}`;
                        const hasError = errors[key]?.length > 0;
                        const partResult = results[subject.id]?.partResults.find((pr: any) => pr.partId === part.id);

                        return (
                          <div key={part.id} className="space-y-2">
                            <div className="flex items-center gap-2">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                part.partType === 'TH' ? 'bg-blue-100 text-blue-800' :
                                part.partType === 'PR' ? 'bg-green-100 text-green-800' :
                                part.partType === 'VI' ? 'bg-purple-100 text-purple-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {part.partType}
                              </span>
                              <span className="text-sm font-medium text-gray-700">{part.name}</span>
                            </div>
                            
                            <input
                              type="number"
                              min="0"
                              max={part.rawFullMark}
                              step="0.5"
                              value={marks[key] || ""}
                              onChange={(e) => handleMarkChange(selectedStudent, part.id, e.target.value)}
                              placeholder={`Max: ${part.rawFullMark}`}
                              className={`w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none ${
                                hasError ? 'border-red-400 bg-red-50' : 'border-gray-300'
                              }`}
                            />
                            
                            <div className="text-xs text-gray-500">
                              Raw: {part.rawFullMark} → System: {part.convertedFullMark} (Pass: {part.passMark})
                            </div>

                            {partResult && (
                              <div className="text-xs space-y-1">
                                <div className="flex justify-between">
                                  <span>Converted:</span>
                                  <span className="font-medium">{partResult.convertedMark.toFixed(1)}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span>Percentage:</span>
                                  <span className="font-medium">{partResult.percentage.toFixed(1)}%</span>
                                </div>
                                <div className={`text-center font-medium ${
                                  partResult.isPassed ? 'text-green-600' : 'text-red-600'
                                }`}>
                                  {partResult.isPassed ? 'PASS' : 'FAIL'}
                                </div>
                              </div>
                            )}

                            {hasError && (
                              <div className="text-xs text-red-600">
                                {errors[key].map((error, idx) => (
                                  <div key={idx}>{error}</div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                  </div>
                </div>
              ))}
            </div>

            {/* Save Button */}
            <div className="flex justify-end">
              <button
                onClick={handleSave}
                disabled={saving || Object.values(errors).some(errs => errs.length > 0)}
                className="px-6 py-3 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white rounded-xl font-medium transition-colors"
              >
                {saving ? 'Saving...' : `Save Marks for ${selectedStudentData?.name}`}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
