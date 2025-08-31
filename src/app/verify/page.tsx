"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { resendSignupOtpAction, verifyEmailOtpAction } from "@/app/actions/auth";

export default function VerifyPage() {
  const sp = useSearchParams();
  const router = useRouter();
  const email = useMemo(() => sp.get("email") ?? "", [sp]);

  const [code, setCode] = useState("");
  const [msg, setMsg] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  useEffect(() => {
    if (!email) setMsg("Missing email. Return to signup.");
  }, [email]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    setMsg("");
    const form = new FormData();
    form.set("email", email);
    form.set("code", code);
    const res = await verifyEmailOtpAction(form);
    setLoading(false);
    if (res.ok) {
      setMsg("Email verified! Redirecting to complete profile...");
      setTimeout(() => router.push(`/complete-profile?email=${encodeURIComponent(email)}`), 1200);
    } else {
      setMsg(res.error ?? "Verification failed.");
    }
  }

  async function onResend() {
    if (!email) return;
    setResending(true);
    setMsg("");
    const form = new FormData();
    form.set("email", email);
    const res = await resendSignupOtpAction(form);
    setResending(false);
    if (res.ok) setMsg("A new verification code was sent to your email.");
    else setMsg(res.error ?? "Failed to resend code.");
  }

  return (
    <main className="flex items-center justify-center py-12">
      <div className="w-full max-w-md rounded-xl border border-emerald-200 dark:border-blue-800 bg-green-50 dark:bg-blue-900 shadow-sm p-7 text-neutral-900 dark:text-white">
        <h1 className="text-2xl font-semibold mb-1">Verify your email</h1>
        <p className="text-sm text-neutral-600 dark:text-neutral-300 mb-6">We sent a 6-digit code to: <span className="font-medium">{email || "(no email)"}</span></p>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Verification code</label>
            <input
              inputMode="numeric"
              pattern="[0-9]{6}"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, ""))}
              placeholder="Enter 6-digit code"
              className="w-full rounded-md border border-emerald-300 dark:border-blue-700 bg-white dark:bg-blue-800 text-black dark:text-white placeholder-neutral-400 dark:placeholder-blue-200 px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500 dark:focus:ring-sky-400 tracking-widest text-center"
              required
            />
          </div>
          <button type="submit" disabled={loading || !email || code.length !== 6} className="w-full inline-flex items-center justify-center rounded-md btn-primary text-white font-medium px-4 py-2.5 transition-colors disabled:opacity-60">
            {loading ? "Verifying..." : "Verify"}
          </button>
        </form>

        <div className="mt-4 text-sm">
          <button onClick={onResend} disabled={resending || !email} className="underline">
            {resending ? "Sending..." : "Resend code"}
          </button>
        </div>

        {msg && <p className="mt-4 text-sm text-neutral-800 dark:text-blue-100">{msg}</p>}
      </div>
    </main>
  );
}
