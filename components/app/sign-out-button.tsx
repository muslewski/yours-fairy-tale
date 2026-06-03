"use client";

/**
 * SignOutButton — ends the Better Auth session, then sends the parent back to
 * the sign-in page. Used on the profile page.
 *
 * `authClient.signOut()` clears the session cookie; we then navigate to /sign-in
 * (replace, so Back doesn't land on a now-gated page). A pending state keeps the
 * button from being double-tapped. Copy is calm and parent-facing per the
 * brand-voice guide.
 */
import { useState } from "react";
import { useRouter } from "next/navigation";

import { authClient } from "@/lib/auth-client";

export function SignOutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function onSignOut() {
    if (pending) return;
    setPending(true);
    try {
      await authClient.signOut();
    } finally {
      router.replace("/sign-in");
    }
  }

  return (
    <button
      type="button"
      onClick={onSignOut}
      disabled={pending}
      className="inline-flex items-center rounded-full border-2 border-brand-deep bg-white px-6 py-3 font-bold text-brand-deep transition-shadow hover:shadow-comic-sm disabled:cursor-not-allowed disabled:opacity-50"
      style={{ fontFamily: "var(--font-fredoka)" }}
    >
      {pending ? "Signing out" : "Sign out"}
    </button>
  );
}
