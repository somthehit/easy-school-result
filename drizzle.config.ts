import type { Config } from "drizzle-kit";
import path from "path";
import fs from "fs";

export default {
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
    ssl: (() => {
      // Allow disabling SSL explicitly
      if (String(process.env.DATABASE_SSL).toLowerCase() === "false") return false as any;
      // Prefer CA from env
      const envCa = process.env.DATABASE_SSL_CA;
      if (envCa && envCa.trim().length > 0) {
        return { rejectUnauthorized: true, ca: envCa } as any;
      }
      // Try file path from env or default location
      const caPath = process.env.DATABASE_SSL_CA_PATH || path.resolve(process.cwd(), "src/app/certs/supabase.pem");
      try {
        const ca = fs.readFileSync(caPath).toString();
        return { rejectUnauthorized: true, ca } as any;
      } catch {
        // Fallback: do not reject unauthorized so CLI can operate without CA
        return { rejectUnauthorized: false } as any;
      }
    })(),
  },
  tablesFilter: ["*"]
} satisfies Config;
