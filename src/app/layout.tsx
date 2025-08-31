import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ErrorBoundary from "../components/ErrorBoundary";

// Render per-request to avoid sharing user-specific HTML across users
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export const metadata: Metadata = {
  title: "School Result Portal",
  description: "Publish and view exam results with grades, ranks and shareable links.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning
        className="antialiased min-h-screen flex flex-col bg-gradient-to-b from-emerald-50 to-white text-black transition-colors font-sans"
      >
        <ErrorBoundary>
          <Navbar />
          <div className="mx-auto max-w-6xl px-4 sm:px-6 flex-1 w-full">
            <main className="py-8 pb-28">{children}</main>
          </div>
          <Footer />
        </ErrorBoundary>
      </body>
    </html>
  );
}
