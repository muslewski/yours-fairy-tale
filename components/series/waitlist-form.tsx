"use client";

import { useState, type FormEvent } from "react";

type Status = "idle" | "loading" | "sent" | "error";

export function WaitlistForm() {
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState(""); // honeypot
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!email.trim() || status === "loading") return;
    setStatus("loading");
    setErrorMessage("");
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, company }),
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (res.ok && data.ok) {
        setStatus("sent");
      } else {
        setStatus("error");
        setErrorMessage(
          data.error ?? "We couldn't add you to the list just now. Please try again in a moment.",
        );
      }
    } catch {
      setStatus("error");
      setErrorMessage("We couldn't reach our server. Please try again in a moment.");
    }
  }

  if (status === "sent") {
    return (
      <p
        role="status"
        className="rounded-2xl border-[3px] border-brand-deep bg-white px-6 py-5 text-base font-bold text-brand-deep shadow-comic"
      >
        You are on the list. We will write the moment it is ready.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      {/* Honeypot — hidden from real users, catches bots. */}
      <div aria-hidden className="absolute left-[-9999px]">
        <label htmlFor="series-company">Company</label>
        <input
          id="series-company"
          name="company"
          tabIndex={-1}
          autoComplete="off"
          value={company}
          onChange={(e) => setCompany(e.target.value)}
        />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <label htmlFor="series-email" className="sr-only">
          Email address
        </label>
        <input
          id="series-email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@email.com"
          aria-describedby={status === "error" ? "series-waitlist-error" : undefined}
          className="w-full rounded-xl border-[3px] border-brand-deep bg-white px-5 py-4 text-base font-semibold text-brand-deep placeholder:text-brand-deep/40 focus:outline-none focus:ring-4 focus:ring-brand-pink/40"
        />
        <button
          type="submit"
          disabled={status === "loading"}
          className="shrink-0 rounded-xl border-[3px] border-brand-deep bg-brand-pink px-7 py-4 text-base font-black uppercase tracking-wide text-white shadow-comic transition-transform duration-150 active:translate-y-1 active:shadow-comic-sm disabled:opacity-50"
        >
          {status === "loading" ? "Adding you" : "Notify me"}
        </button>
      </div>

      {status === "error" && (
        <p
          id="series-waitlist-error"
          role="alert"
          className="text-sm font-semibold text-brand-pink"
        >
          {errorMessage}
        </p>
      )}
    </form>
  );
}
