import React from "react";
import { redirect } from "next/navigation";
import { db, tables } from "@/db/client";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

async function contactAction(formData: FormData) {
  "use server";
  const name = String(formData.get("name") || "").trim();
  const email = String(formData.get("email") || "").trim();
  const message = String(formData.get("message") || "").trim();

  // Basic validation
  if (!name || !email || !message) {
    redirect("/contact?error=Please%20fill%20all%20required%20fields");
  }

  // Optional: resolve logged-in user id from cookie
  let userId: string | null = null;
  try {
    const raw = (await cookies()).get("auth_user")?.value ?? "";
    if (raw) {
      const parsed = JSON.parse(raw) as { id?: string | number };
      if (parsed?.id != null) userId = String(parsed.id);
    }
  } catch {}

  // Persist the message
  try {
    await db.insert(tables.contactMessages).values({
      name,
      email,
      message,
      userId: userId as any,
    });
  } catch (e) {
    // Fallback: do not expose internals
    redirect("/contact?error=Could%20not%20submit%20message");
  }

  redirect("/contact?sent=1");
}

export default async function ContactPage({ searchParams }: { searchParams: Promise<{ sent?: string; error?: string }> }) {
  const sp = await searchParams;
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Contact Us</h1>

      {sp?.sent === "1" && (
        <div className="rounded-md border border-green-200 bg-green-50 text-green-800 px-3 py-2 text-sm">
          Your message has been sent. We'll get back to you soon.
        </div>
      )}

      {sp?.error && (
        <div className="rounded-md border border-red-200 bg-red-50 text-red-800 px-3 py-2 text-sm">
          {decodeURIComponent(sp.error)}
        </div>
      )}

      <form action={contactAction} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <label htmlFor="name" className="text-sm text-neutral-700">Name</label>
            <input id="name" name="name" required className="rounded-md border px-3 py-2 bg-transparent" placeholder="Your name" />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="email" className="text-sm text-neutral-700">Email</label>
            <input id="email" name="email" type="email" required className="rounded-md border px-3 py-2 bg-transparent" placeholder="you@example.com" />
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="message" className="text-sm text-neutral-700">Message</label>
          <textarea id="message" name="message" required rows={6} className="rounded-md border px-3 py-2 bg-transparent" placeholder="How can we help?" />
        </div>
        <div>
          <button type="submit" className="px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-colors">Send Message</button>
        </div>
      </form>
    </div>
  );
}
