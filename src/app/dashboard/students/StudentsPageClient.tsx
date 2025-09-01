'use client';

import { useState } from 'react';
import BulkImportModal from '@/components/BulkImportModal';

interface StudentsPageClientProps {
  classes: any[];
  defaultClassId: string;
}

export default function StudentsPageClient({ classes, defaultClassId }: StudentsPageClientProps) {
  const [showBulkImport, setShowBulkImport] = useState(false);

  return (
    <>
      {/* Bulk Import Button */}
      <button
        onClick={() => setShowBulkImport(true)}
        className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 text-white font-medium rounded-lg transition-all duration-200 shadow-sm hover:shadow-md"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
        </svg>
        Bulk Import
      </button>

      {/* Bulk Import Modal */}
      <BulkImportModal
        isOpen={showBulkImport}
        onClose={() => setShowBulkImport(false)}
        type="students"
        classId={defaultClassId}
        classes={classes}
      />
    </>
  );
}
