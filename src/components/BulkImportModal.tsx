'use client';

import { useState } from 'react';

interface BulkImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'students' | 'marks';
  classId?: string;
  examId?: string;
  classes?: Array<{id: string, name: string, section?: string}>;
}

export default function BulkImportModal({
  isOpen,
  onClose,
  type,
  classId,
  examId,
  classes = [],
}: BulkImportModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [errors, setErrors] = useState<string[]>([]);
  const [successMessage, setSuccessMessage] = useState('');
  const [selectedClassId, setSelectedClassId] = useState<string>(classId || '');

  if (!isOpen) return null;

  const downloadTemplate = () => {
    if (type === 'students') {
      const csvContent = `name,rollNo,section,dob,contact,parentName,fathersName,mothersName,address,gender
John Doe,1,A,2005-01-15,1234567890,Parent Name,Father Name,Mother Name,123 Street,Male
Jane Smith,2,A,2005-02-20,0987654321,Parent Name 2,Father Name 2,Mother Name 2,456 Avenue,Female`;
      
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'students_template.csv';
      a.click();
      window.URL.revokeObjectURL(url);
    } else {
      const csvContent = `rollNo,subjectCode,subjectPart,obtained
1,MATH,theory,85
1,MATH,practical,90
2,ENG,theory,78`;
      
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'marks_template.csv';
      a.click();
      window.URL.revokeObjectURL(url);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setErrors([]);
      setSuccessMessage('');
    }
  };

  const parseCSV = (text: string) => {
    const lines = text.split('\n').filter(line => line.trim());
    if (lines.length < 2) throw new Error('CSV must have at least a header and one data row');
    
    const headers = lines[0].split(',').map(h => h.trim());
    const data = lines.slice(1).map(line => {
      const values = line.split(',').map(v => v.trim());
      const obj: any = {};
      headers.forEach((header, index) => {
        let value: any = values[index] || '';
        
        // Convert data types for specific fields
        if (header === 'rollNo') {
          value = value ? parseInt(value, 10) : 0;
        } else if (header === 'gender') {
          // Normalize gender values
          const normalizedGender = value.toLowerCase();
          if (normalizedGender === 'male' || normalizedGender === 'm') {
            value = 'Male';
          } else if (normalizedGender === 'female' || normalizedGender === 'f') {
            value = 'Female';
          } else if (normalizedGender === 'other' || normalizedGender === 'o') {
            value = 'Other';
          } else {
            value = 'Male'; // Default fallback
          }
        }
        
        obj[header] = value;
      });
      return obj;
    });
    
    return data;
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    setUploadProgress(0);
    setErrors([]);
    setSuccessMessage('');

    try {
      const text = await file.text();
      let data;

      if (file.name.endsWith('.csv')) {
        data = parseCSV(text);
      } else if (file.name.endsWith('.json')) {
        data = JSON.parse(text);
      } else {
        throw new Error('Only CSV and JSON files are supported');
      }

      setUploadProgress(50);

      const endpoint = type === 'students' 
        ? '/api/students/bulk-import'
        : '/api/marks/bulk-import';

      let payload: any;
      if (type === 'students') {
        const targetClassId = selectedClassId || classId;
        if (!targetClassId) {
          setErrors(['Please select a class before importing students']);
          setUploading(false);
          setUploadProgress(0);
          return;
        }
        payload = { classId: targetClassId, students: data };
      } else if (type === 'marks' && examId) {
        payload = { examId, data };
      } else {
        payload = { data };
      }

      console.log('Sending payload:', JSON.stringify(payload, null, 2));

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      setUploadProgress(100);

      let result;
      try {
        result = await response.json();
      } catch (e) {
        result = { error: `Failed to parse response: ${response.status} ${response.statusText}` };
      }

      if (!response.ok) {
        console.error('API Error Response:', result);
        console.error('Response status:', response.status, response.statusText);
        
        if (result.details && Array.isArray(result.details)) {
          setErrors(result.details.map((detail: any) => `${detail.path?.join('.')}: ${detail.message}`));
        } else if (result.errors && Array.isArray(result.errors)) {
          setErrors(result.errors);
        } else {
          setErrors([result.error || `Server error: ${response.status} ${response.statusText}`]);
        }
      } else {
        setSuccessMessage(
          `Successfully imported ${result.imported || data.length} ${type}!`
        );
        setFile(null);
        // Reset file input
        const fileInput = document.getElementById('file-input') as HTMLInputElement;
        if (fileInput) fileInput.value = '';
      }
    } catch (error) {
      setErrors([error instanceof Error ? error.message : 'Upload failed']);
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">
            Bulk Import {type === 'students' ? 'Students' : 'Marks'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
          >
            ×
          </button>
        </div>
        <div className="px-6 py-6 space-y-6">
          {/* Template Download */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="font-medium text-blue-900 mb-2 flex items-center gap-2">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Download Template
            </h3>
            <p className="text-blue-700 text-sm mb-3">
              Download the CSV template to see the required format for your data.
            </p>
            <button
              onClick={downloadTemplate}
              className="flex items-center gap-2 px-3 py-1.5 text-sm border border-blue-300 text-blue-700 rounded hover:bg-blue-100 transition-colors"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Download {type === 'students' ? 'Students' : 'Marks'} Template
            </button>
          </div>

          {/* Class Selection for Students */}
          {type === 'students' && classes.length > 0 && (
            <div>
              <label htmlFor="class-select" className="block text-sm font-medium text-gray-700 mb-2">
                Select Class <span className="text-red-500">*</span>
              </label>
              <select
                id="class-select"
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Choose a class...</option>
                {classes.map((cls) => (
                  <option key={cls.id} value={cls.id}>
                    {cls.name} {cls.section ? `- ${cls.section}` : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* File Upload */}
          <div>
            <label htmlFor="file-input" className="block text-sm font-medium text-gray-700 mb-2">
              Upload File (CSV or JSON)
            </label>
            <input
              id="file-input"
              type="file"
              accept=".csv,.json"
              onChange={handleFileChange}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
          </div>

          {/* Upload Progress */}
          {uploading && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Uploading...</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
            </div>
          )}

          {/* Error Messages */}
          {errors.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="text-red-800">
                <h4 className="font-medium mb-2">Upload Errors:</h4>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  {errors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Success Message */}
          {successMessage && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="text-green-800 text-sm">
                {successMessage}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleUpload}
              disabled={!file || uploading}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              {uploading ? (
                <>
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Uploading...
                </>
              ) : (
                <>
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  Upload
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
