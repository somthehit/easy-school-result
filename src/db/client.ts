import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";
import { env } from "@/env";
import fs from "fs";
import path from "path";

// Singleton Postgres client to be reused across server actions
// SSL handling: respect sslmode in URL; otherwise avoid forcing SSL for local/dev
const urlLower = env.DATABASE_URL.toLowerCase();
const hasSslmode = urlLower.includes("sslmode=");
let sslOption: boolean | "require" | "allow" | "prefer" | "verify-full" | { ca: string; rejectUnauthorized: boolean } | undefined = undefined;
if (hasSslmode) {
  if (/(^|[?&])sslmode=require/.test(urlLower)) sslOption = "require";
  else if (/(^|[?&])sslmode=disable/.test(urlLower)) sslOption = false;
} else {
  // Heuristics: known cloud hosts usually need SSL; local hosts don't
  const needsCloudSSL = /neon\.tech|render\.com|supabase\.co|vercel\.app|railway\.app|amazonaws\.com/i.test(urlLower);
  sslOption = needsCloudSSL ? "require" : false;
}

// If a CA is provided, configure strict SSL verification
try {
  const caInline = process.env.DATABASE_SSL_CA?.trim();
  const caPath = process.env.DATABASE_SSL_CA_PATH?.trim() || "src/app/certs/supabase.pem";
  let ca: string | undefined = undefined;
  if (caInline) {
    ca = caInline;
  } else if (fs.existsSync(path.resolve(process.cwd(), caPath))) {
    ca = fs.readFileSync(path.resolve(process.cwd(), caPath)).toString();
  }
  if (ca) {
    sslOption = { ca, rejectUnauthorized: true };
  }
} catch {
  // ignore, fallback to previous sslOption
}

const queryClient = postgres(env.DATABASE_URL, {
  ssl: sslOption,
  max: 10,
});

export const db = drizzle(queryClient, { schema });

export type DB = typeof db;
export * as tables from "./schema";
