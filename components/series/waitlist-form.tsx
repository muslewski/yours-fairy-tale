"use client";

import { useState, type SyntheticEvent } from "react";

export function WaitlistForm() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: SyntheticEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setSubmitted(true);
  };

  if (submitted) {
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
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:flex-row">
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
        className="w-full rounded-xl border-[3px] border-brand-deep bg-white px-5 py-4 text-base font-semibold text-brand-deep placeholder:text-brand-deep/40 focus:outline-none focus:ring-4 focus:ring-brand-pink/40"
      />
      <button
        type="submit"
        className="shrink-0 rounded-xl border-[3px] border-brand-deep bg-brand-pink px-7 py-4 text-base font-black uppercase tracking-wide text-white shadow-comic transition-transform duration-150 active:translate-y-1 active:shadow-comic-sm"
      >
        Notify me
      </button>
    </form>
  );
}
