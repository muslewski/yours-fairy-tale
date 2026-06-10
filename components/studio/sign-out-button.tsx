"use client";

/**
 * Sign out of the studio: POST to Payload's logout endpoint (clears the
 * payload-token cookie), then hard-navigate to sign-in so every server
 * component re-evaluates with the cookie gone.
 */
export function SignOutButton() {
  async function handleSignOut() {
    try {
      await fetch("/api/admins/logout", { method: "POST", credentials: "include" });
    } finally {
      window.location.href = "/studio/sign-in";
    }
  }

  return (
    <button
      type="button"
      onClick={handleSignOut}
      className="text-brand-deep/60 underline-offset-4 hover:underline"
    >
      Sign out
    </button>
  );
}
