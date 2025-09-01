import { db, tables } from "@/db/client";
import { eq } from "drizzle-orm";
import { requireAuthUser } from "../actions";
import ClassesPageClient from "@/components/ClassesPageClient";

export const dynamic = "force-dynamic";

export default async function ClassesPage() {
  const { id: userId } = await requireAuthUser();
  const classes = await db
    .select()
    .from(tables.classes)
    .where(eq(tables.classes.userId as any, userId as any))
    .orderBy(tables.classes.name);

  console.log('Classes fetched for display:', classes.length);
  console.log('Classes data:', classes.map(c => ({
    id: c.id,
    name: c.name,
    section: c.section,
    year: c.year
  })));

  return <ClassesPageClient initialClasses={classes.map(c => ({
    ...c,
    section: c.section ?? undefined
  }))} />;
}
