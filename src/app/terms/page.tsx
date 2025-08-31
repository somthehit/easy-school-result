import React from "react";

export const dynamic = "force-dynamic";
export const metadata = { title: "Terms of Service | Easy Result" };

export default function TermsPage() {
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Terms of Service</h1>
      <p className="text-sm text-neutral-600">Last updated: August 25, 2025</p>

      <section className="space-y-3 text-sm leading-6">
        <p>
          These Terms of Service ("Terms") govern your access to and use of Easy Result (the "Service"). By
          using the Service, you agree to be bound by these Terms.
        </p>

        <h2 className="font-medium text-base">Use of Service</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li>You must provide accurate information and keep your account secure.</li>
          <li>You are responsible for the content you input, including class, student and exam data.</li>
          <li>You agree not to misuse the Service or interfere with its normal operation.</li>
        </ul>

        <h2 className="font-medium text-base">Data and Privacy</h2>
        <p>
          Your use of the Service is also subject to our <a className="text-sky-700 underline" href="/privacy">Privacy Policy</a>.
        </p>

        <h2 className="font-medium text-base">Intellectual Property</h2>
        <p>
          The Service, including its UI, design and code, is owned by us or our licensors. You may not copy,
          modify, or distribute any part of the Service except as permitted by these Terms.
        </p>

        <h2 className="font-medium text-base">Availability and Changes</h2>
        <p>
          We may update, suspend, or discontinue features at any time. We aim for high availability but do not
          guarantee uninterrupted operation.
        </p>

        <h2 className="font-medium text-base">Disclaimer</h2>
        <p>
          The Service is provided "as is" without warranties of any kind. We are not liable for any indirect or
          consequential damages arising out of your use of the Service.
        </p>

        <h2 className="font-medium text-base">Termination</h2>
        <p>
          We may suspend or terminate your access if you violate these Terms. You may stop using the Service at
          any time.
        </p>

        <h2 className="font-medium text-base">Contact</h2>
        <p>
          If you have questions about these Terms, please contact us via <a className="text-sky-700 underline" href="/contact">/contact</a>.
        </p>
      </section>
    </div>
  );
}
