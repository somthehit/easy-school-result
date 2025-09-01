"use client";

import { useState } from "react";
import LoadingButton from "./LoadingButton";
import { createClassAction, updateClassAction, deleteClassAction } from "@/app/dashboard/classes/actions";

interface CreateClassFormProps {
  onSuccess?: () => void;
}

export function CreateClassForm({ onSuccess }: CreateClassFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const formData = new FormData(e.currentTarget);
      const result = await createClassAction(formData);
      if (result.success) {
        e.currentTarget.reset();
        onSuccess?.();
      } else {
        setError(result.error || "Failed to create class");
      }
    } catch (err: any) {
      setError(err.message || "Failed to create class");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700">Class Name</label>
        <input 
          name="name" 
          required 
          placeholder="e.g., Grade 8" 
          className="w-full rounded-xl border border-gray-200 px-4 py-3 bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 transition-all duration-200" 
        />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700">Section</label>
        <input 
          name="section" 
          placeholder="e.g., A (optional)" 
          className="w-full rounded-xl border border-gray-200 px-4 py-3 bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 transition-all duration-200" 
        />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700">Year</label>
        <input 
          name="year" 
          type="number" 
          required 
          min={1900} 
          max={3000} 
          placeholder="e.g., 2081" 
          className="w-full rounded-xl border border-gray-200 px-4 py-3 bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 transition-all duration-200" 
        />
      </div>
      <div className="flex items-end">
        <LoadingButton 
          type="submit" 
          isLoading={isLoading}
          className="w-full px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-medium rounded-xl transition-all duration-200 shadow-sm hover:shadow-md flex items-center justify-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Create
        </LoadingButton>
      </div>
      {error && (
        <div className="md:col-span-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}
    </form>
  );
}

interface UpdateClassFormProps {
  classData: {
    id: string;
    name: string;
    section?: string;
    year?: number;
  };
  onSuccess?: () => void;
}

export function UpdateClassForm({ classData, onSuccess }: UpdateClassFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const formData = new FormData(e.currentTarget);
      const result = await updateClassAction(formData);
      if (result.success) {
        onSuccess?.();
      } else {
        setError(result.error || "Failed to update class");
      }
    } catch (err: any) {
      setError(err.message || "Failed to update class");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-white rounded-xl p-4 border border-gray-200">
      <input type="hidden" name="id" value={classData.id} />
      <div className="space-y-1">
        <label className="text-xs font-medium text-gray-600">Class Name</label>
        <input 
          name="name" 
          defaultValue={classData.name} 
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-200" 
        />
      </div>
      <div className="space-y-1">
        <label className="text-xs font-medium text-gray-600">Section</label>
        <input 
          name="section" 
          defaultValue={classData.section ?? ""} 
          placeholder="Optional" 
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-200" 
        />
      </div>
      <div className="space-y-1">
        <label className="text-xs font-medium text-gray-600">Year</label>
        <input 
          name="year" 
          defaultValue={classData.year ?? ""} 
          placeholder="Year" 
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-200" 
        />
      </div>
      <div className="flex items-end">
        <LoadingButton 
          type="submit" 
          isLoading={isLoading}
          className="w-full px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-all duration-200 text-sm flex items-center justify-center gap-2"
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          Update
        </LoadingButton>
      </div>
      {error && (
        <div className="md:col-span-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}
    </form>
  );
}

interface DeleteClassButtonProps {
  classId: string;
  onSuccess?: () => void;
}

interface EditClassButtonProps {
  classData: {
    id: string;
    name: string;
    section?: string;
    year?: number;
  };
  onSuccess?: () => void;
}

export function EditClassButton({ classData, onSuccess }: EditClassButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const formData = new FormData(e.currentTarget);
      const result = await updateClassAction(formData);
      if (result.success) {
        setIsOpen(false);
        onSuccess?.();
      } else {
        setError(result.error || "Failed to update class");
      }
    } catch (err: any) {
      setError(err.message || "Failed to update class");
    } finally {
      setIsLoading(false);
    }
  }

  if (isOpen) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Edit Class</h3>
            <button
              onClick={() => setIsOpen(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <input type="hidden" name="id" value={classData.id} />
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Class Name</label>
              <input 
                name="name" 
                defaultValue={classData.name}
                required
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500" 
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Section</label>
              <input 
                name="section" 
                defaultValue={classData.section ?? ""}
                placeholder="Optional" 
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500" 
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
              <input 
                name="year" 
                type="number"
                defaultValue={classData.year ?? ""}
                min={1900}
                max={3000}
                required
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500" 
              />
            </div>
            
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-800 text-sm">{error}</p>
              </div>
            )}
            
            <div className="flex justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <LoadingButton
                type="submit"
                isLoading={isLoading}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700"
              >
                Update
              </LoadingButton>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={() => setIsOpen(true)}
      className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
    >
      Edit
    </button>
  );
}

export function DeleteClassButton({ classId, onSuccess }: DeleteClassButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  async function handleDelete() {
    if (!confirm("Are you sure you want to delete this class? This action cannot be undone.")) {
      return;
    }

    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append("id", classId);
      const result = await deleteClassAction(formData);
      if (result.success) {
        onSuccess?.();
      } else {
        alert(result.error || "Failed to delete class");
      }
    } catch (err: any) {
      alert(err.message || "Failed to delete class");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <LoadingButton
      onClick={handleDelete}
      isLoading={isLoading}
      className="inline-flex items-center px-3 py-1.5 border border-red-300 text-xs font-medium rounded text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
    >
      Delete
    </LoadingButton>
  );
}
