import { ReactNode } from 'react';

declare module './StudentResultsClient' {
  interface StudentResultsClientProps {
    data: {
      student: any;
      class: any;
      marks: any[];
      examClassStats?: Record<string, { percentage: number; total: number; possible: number; rank: number; division: string; grade: string; classSize: number }>;
    };
  }

  const StudentResultsClient: React.FC<StudentResultsClientProps>;
  export default StudentResultsClient;
}
