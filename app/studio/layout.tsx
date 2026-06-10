/**
 * /studio shell — noindex + the cream page background for every studio page,
 * INCLUDING sign-in. This layout does NOT gate: the auth check lives in the
 * (gated) group layout so /studio/sign-in stays reachable when signed out.
 */
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Studio — Yours Fairy Tale",
  robots: { index: false, follow: false },
};

export default function StudioShellLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <main className="min-h-screen bg-brand-cream pb-24 pt-10 font-[family-name:var(--font-quicksand)] text-brand-deep">
      {children}
    </main>
  );
}
