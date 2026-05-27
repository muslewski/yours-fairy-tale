import Link from "next/link";

export function BackLink({ tone = "dark" }: { tone?: "dark" | "light" }) {
  const styles =
    tone === "light"
      ? "bg-white/15 text-white ring-white/20 hover:bg-white/25"
      : "bg-white/80 text-[#1a1033] ring-[#1a1033]/10 hover:bg-white";
  return (
    <Link
      href="/"
      className={`fixed bottom-4 left-4 z-50 inline-flex items-center gap-2 rounded-full px-3.5 py-2 text-xs font-semibold uppercase tracking-wider shadow-lg ring-1 backdrop-blur-md transition ${styles}`}
    >
      <span aria-hidden>←</span>
      <span>All concepts</span>
    </Link>
  );
}
