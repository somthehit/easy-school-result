export type GradeDivision = { grade: string; division: string };

// Simple example grading bands; adjust as needed
const BANDS: Array<{ min: number; grade: string; division: string }> = [
  { min: 90, grade: "A+", division: "Distinction" },
  { min: 80, grade: "A", division: "Distinction" },
  { min: 70, grade: "B+", division: "First" },
  { min: 60, grade: "B", division: "First" },
  { min: 50, grade: "C+", division: "Second" },
  { min: 40, grade: "C", division: "Third" },
  { min: 0, grade: "D", division: "Fail" },
];

export function gradeForPercentage(pct: number): GradeDivision {
  const band = BANDS.find((b) => pct >= b.min) ?? BANDS[BANDS.length - 1];
  return { grade: band.grade, division: band.division };
}
