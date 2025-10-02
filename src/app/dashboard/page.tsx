import { getDashboardData } from "./actions";
import DashboardClient from "./DashboardClient";

export const dynamic = "force-dynamic";

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ classId?: string }> }) {
  const sp = await searchParams;
  const classId = sp?.classId;
  
  const data = await getDashboardData(classId);
  
  return <DashboardClient data={data} />;
}
