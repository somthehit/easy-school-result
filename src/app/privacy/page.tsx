import React from "react";

export const dynamic = "force-dynamic";
export const metadata = { title: "Privacy Policy | Easy Result" };

export default function PrivacyPage() {
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Privacy Policy</h1>
      <p className="text-sm text-neutral-600">Last updated: August 25, 2025</p>

      <section className="space-y-3 text-sm leading-6">
        <p>
          Easy Result ("we", "our", "us") respects your privacy. This Privacy Policy explains how we collect,
          use, and protect information when you use our website and services.
        </p>
        <h2 className="font-medium text-base">Information We Collect</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li>Account information such as name and email when you sign up.</li>
          <li>Class, student and exam data you provide to run result management.</li>
          <li>Usage data and device information to improve the service.</li>
        </ul>

        <h2 className="font-medium text-base">How We Use Information</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li>To provide and operate the service (e.g., generate results, certificates, ID cards).</li>
          <li>To maintain security, troubleshoot, and improve features.</li>
          <li>To communicate updates, respond to inquiries, and provide support.</li>
        </ul>

        <h2 className="font-medium text-base">Data Sharing</h2>
        <p>
          We do not sell personal information. We may share data with service providers strictly to operate
          the platform (e.g., hosting, analytics), bound by confidentiality obligations, or when required by law.
        </p>

        <h2 className="font-medium text-base">Data Retention</h2>
        <p>
          We retain information as long as your account is active or as needed to provide the service. You can
          request deletion of your account data at any time.
        </p>

        <h2 className="font-medium text-base">Your Rights</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li>Access, correct, or delete your data.</li>
          <li>Export certain data you have provided.</li>
          <li>Contact us for questions or requests at <a className="text-sky-700 underline" href="/contact">/contact</a>.</li>
        </ul>

        <h2 className="font-medium text-base">Children's Privacy</h2>
        <p>
          We process student information provided by authorized school staff strictly for educational purposes.
          If you believe we have collected data improperly, please contact us.
        </p>

        <h2 className="font-medium text-base">Changes to this Policy</h2>
        <p>
          We may update this Policy from time to time. Material changes will be indicated by updating the date above.
        </p>
      </section>
    </div>
  );
}
