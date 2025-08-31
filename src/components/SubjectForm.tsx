"use client";

import { useState } from "react";
import LoadingButton from "./LoadingButton";

interface SubjectFormProps {
  classes: { id: string; name: string; section?: string | null }[];
  masterSubjects: { id: string; name: string }[];
  createSubject: (formData: FormData) => Promise<void>;
}

export default function SubjectForm({ classes, masterSubjects, createSubject }: SubjectFormProps) {
  const [subjectName, setSubjectName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleMasterSubjectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedOption = e.target.options[e.target.selectedIndex];
    if (selectedOption.value) {
      setSubjectName(selectedOption.text);
    } else {
      setSubjectName("");
    }
  };

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const formData = new FormData(e.currentTarget);
      await createSubject(formData);
      e.currentTarget.reset();
      setSubjectName("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create subject");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* First Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">Class</label>
          <select name="classId" required className="w-full rounded-xl border border-gray-200 px-4 py-3 bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 transition-all duration-200">
            <option value="">Select Class</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>{c.name} - {c.section ?? ""}</option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">Major Subject</label>
          <select 
            name="masterSubjectId" 
            required 
            className="w-full rounded-xl border border-gray-200 px-4 py-3 bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 transition-all duration-200"
            onChange={handleMasterSubjectChange}
          >
            <option value="">Select Major Subject</option>
            {masterSubjects.map((m) => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
          <p className="text-xs text-gray-500">Manage major subjects in <a href="/dashboard/profile/settings" className="text-emerald-600 hover:text-emerald-700 font-medium">Profile → Settings</a></p>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">Subject Name</label>
          <input 
            name="name" 
            value={subjectName}
            onChange={(e) => setSubjectName(e.target.value)}
            placeholder="e.g., Science" 
            required 
            className="w-full rounded-xl border border-gray-200 px-4 py-3 bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 transition-all duration-200" 
          />
        </div>
      </div>

      {/* Submit Button */}
      <div className="flex justify-end">
        <LoadingButton 
          type="submit" 
          isLoading={isLoading}
          className="px-8 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-medium rounded-xl transition-all duration-200 shadow-sm hover:shadow-md flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Subject
        </LoadingButton>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      {/* Info Note */}
      <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
        <div className="flex items-start gap-3">
          <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
            <svg className="w-3 h-3 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <p className="text-sm text-blue-800">The subject will be linked to the selected major subject. Marks (full mark, pass mark) will be defined when creating exams. Parts default to TH/PR if not specified.</p>
        </div>
      </div>
    </form>
  );
}
