/**
 * Flexible Subject-wise Marks Management System
 * Supports multiple parts per subject with automatic conversion logic
 */

export interface SubjectPart {
  id: string;
  name: string;
  partType: string; // TH, PR, VI, AS, etc.
  rawFullMark: number; // Exam scale
  convertedFullMark: number; // System scale
  passMark: number;
  sortOrder: number;
  isActive: boolean;
}

export interface Subject {
  id: string;
  name: string;
  code?: string;
  defaultFullMark: number;
  creditHours: number;
  parts: SubjectPart[];
}

export interface PartMark {
  partId: string;
  obtainedRawMark: number;
  convertedMark?: number;
  isPassed?: boolean;
}

export interface SubjectResult {
  subjectId: string;
  partResults: PartResult[];
  totalRawMark: number;
  totalConvertedMark: number;
  totalFullMark: number;
  percentage: number;
  isPassed: boolean;
  grade?: string;
}

export interface PartResult {
  partId: string;
  partType: string;
  obtainedRawMark: number;
  convertedMark: number;
  rawFullMark: number;
  convertedFullMark: number;
  passMark: number;
  percentage: number;
  isPassed: boolean;
}

/**
 * Convert raw mark to system scale using the formula:
 * converted_mark = (obtained_raw_mark / raw_full_mark) * converted_full_mark
 */
export function convertRawToSystemMark(
  obtainedRawMark: number,
  rawFullMark: number,
  convertedFullMark: number
): number {
  if (rawFullMark <= 0) return 0;
  return Math.round((obtainedRawMark / rawFullMark) * convertedFullMark * 100) / 100;
}

/**
 * Calculate result for a single part
 */
export function calculatePartResult(
  part: SubjectPart,
  obtainedRawMark: number
): PartResult {
  const convertedMark = convertRawToSystemMark(
    obtainedRawMark,
    part.rawFullMark,
    part.convertedFullMark
  );
  
  const percentage = Math.round((convertedMark / part.convertedFullMark) * 10000) / 100;
  const isPassed = convertedMark >= part.passMark;

  return {
    partId: part.id,
    partType: part.partType,
    obtainedRawMark,
    convertedMark,
    rawFullMark: part.rawFullMark,
    convertedFullMark: part.convertedFullMark,
    passMark: part.passMark,
    percentage,
    isPassed,
  };
}

/**
 * Calculate total marks for a subject based on its parts
 * If only TH exists, total = TH
 * If TH + PR exist, total = TH + PR
 * Supports any combination of parts
 */
export function calculateSubjectResult(
  subject: Subject,
  partMarks: PartMark[]
): SubjectResult {
  const activeParts = subject.parts.filter(part => part.isActive);
  const partResults: PartResult[] = [];
  
  let totalRawMark = 0;
  let totalConvertedMark = 0;
  let totalFullMark = 0;
  let allPartsPassed = true;

  // Calculate each part result
  for (const part of activeParts) {
    const partMark = partMarks.find(pm => pm.partId === part.id);
    if (partMark) {
      const partResult = calculatePartResult(part, partMark.obtainedRawMark);
      partResults.push(partResult);
      
      totalRawMark += partMark.obtainedRawMark;
      totalConvertedMark += partResult.convertedMark;
      totalFullMark += part.convertedFullMark;
      
      if (!partResult.isPassed) {
        allPartsPassed = false;
      }
    }
  }

  const percentage = totalFullMark > 0 
    ? Math.round((totalConvertedMark / totalFullMark) * 10000) / 100 
    : 0;

  // Subject passes if all individual parts pass AND total percentage meets criteria
  const isPassed = allPartsPassed && percentage >= 40; // Configurable pass percentage

  return {
    subjectId: subject.id,
    partResults,
    totalRawMark,
    totalConvertedMark,
    totalFullMark,
    percentage,
    isPassed,
    grade: calculateGrade(percentage),
  };
}

/**
 * Calculate grade based on percentage
 */
export function calculateGrade(percentage: number): string {
  if (percentage >= 90) return 'A+';
  if (percentage >= 80) return 'A';
  if (percentage >= 70) return 'B+';
  if (percentage >= 60) return 'B';
  if (percentage >= 50) return 'C+';
  if (percentage >= 40) return 'C';
  return 'F';
}

/**
 * Get division based on percentage
 */
export function getDivision(percentage: number): string {
  if (percentage >= 80) return 'First Division';
  if (percentage >= 60) return 'Second Division';
  if (percentage >= 40) return 'Third Division';
  return 'Fail';
}

/**
 * Calculate overall exam result for a student
 */
export function calculateOverallResult(subjectResults: SubjectResult[]): {
  totalMarks: number;
  totalFullMarks: number;
  percentage: number;
  grade: string;
  division: string;
  isPassed: boolean;
  creditWeightedGPA?: number;
} {
  let totalMarks = 0;
  let totalFullMarks = 0;
  let totalCreditHours = 0;
  let weightedGradePoints = 0;
  let allSubjectsPassed = true;

  for (const result of subjectResults) {
    totalMarks += result.totalConvertedMark;
    totalFullMarks += result.totalFullMark;
    
    if (!result.isPassed) {
      allSubjectsPassed = false;
    }

    // For GPA calculation (if credit hours are available)
    // This would require subject info to be passed along
  }

  const percentage = totalFullMarks > 0 
    ? Math.round((totalMarks / totalFullMarks) * 10000) / 100 
    : 0;

  const isPassed = allSubjectsPassed && percentage >= 40;

  return {
    totalMarks,
    totalFullMarks,
    percentage,
    grade: calculateGrade(percentage),
    division: getDivision(percentage),
    isPassed,
  };
}

/**
 * Validate part marks entry
 */
export function validatePartMark(
  part: SubjectPart,
  obtainedRawMark: number
): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (obtainedRawMark < 0) {
    errors.push('Marks cannot be negative');
  }

  if (obtainedRawMark > part.rawFullMark) {
    errors.push(`Marks cannot exceed ${part.rawFullMark} (full marks for ${part.name})`);
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Get part types with their display names
 */
export const PART_TYPES = {
  TH: 'Theory',
  PR: 'Practical',
  VI: 'Viva',
  AS: 'Assignment',
  PJ: 'Project',
  QZ: 'Quiz',
  CT: 'Class Test',
} as const;

export type PartType = keyof typeof PART_TYPES;

/**
 * Get available part types for adding new parts
 */
export function getAvailablePartTypes(): { value: PartType; label: string }[] {
  return Object.entries(PART_TYPES).map(([value, label]) => ({
    value: value as PartType,
    label,
  }));
}
