"use client";

/**
 * /sign-in — magic-link sign-in page.
 *
 * PUBLIC route — lives outside the gated /app route group so it is never
 * caught by the redirect in app/(app)/app/layout.tsx.
 *
 * Copy written per the brand-voice guide:
 *  - Calm, warm, parent-facing. Sentence case. No hype, no SFX.
 *  - American English.
 *  - Child is the hero; parent is the audience.
 *
 * No-account explainer: conveys that there is no sign-up here — the parent
 * places an order, and a sign-in link is sent to the email used at checkout.
 * Every order is saved to that same account automatically.
 */

import { useState, type FormEvent } from "react";

import { authClient } from "@/lib/auth-client";

export default function SignInPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "sent" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("loading");
    setErrorMessage("");

    const result = await authClient.signIn.magicLink({
      email,
      callbackURL: "/app",
    });

    if (result.error) {
      setStatus("error");
      // Surface a gentle, on-brand error message — never a raw API error.
      setErrorMessage(
        "We couldn't send a sign-in link to that address. Please check the email you used when you placed your order and try again.",
      );
    } else {
      setStatus("sent");
    }
  }

  return (
    <main className="min-h-screen bg-brand-cream flex items-center justify-center px-6 py-16">
      <div className="w-full max-w-md">

        {/* Wordmark */}
        <p
          className="text-sm uppercase tracking-widest text-brand-deep/50 mb-2"
          style={{ fontFamily: "var(--font-quicksand)" }}
        >
          Yours Fairy Tale
        </p>

        <h1
          className="text-4xl text-brand-deep mb-2"
          style={{ fontFamily: "var(--font-fredoka)" }}
        >
          Sign in to your account
        </h1>
        <p
          className="text-brand-deep/70 mb-8"
          style={{ fontFamily: "var(--font-quicksand)" }}
        >
          We'll send a sign-in link to your email.
        </p>

        {status === "sent" ? (
          /* ── Success state ─────────────────────────────────────────────── */
          <div
            className="rounded-2xl border-2 border-brand-deep bg-white shadow-comic p-6"
          >
            <h2
              className="text-xl text-brand-deep mb-2"
              style={{ fontFamily: "var(--font-fredoka)" }}
            >
              Check your email
            </h2>
            <p
              className="text-brand-deep/70"
              style={{ fontFamily: "var(--font-quicksand)" }}
            >
              A sign-in link is on its way to{" "}
              <strong className="text-brand-deep">{email}</strong>. Click the
              link in that email to open your account. The link expires after
              a short while, so check your inbox soon.
            </p>
          </div>
        ) : (
          /* ── Sign-in form ───────────────────────────────────────────────── */
          <form onSubmit={handleSubmit} noValidate>
            <div className="mb-4">
              <label
                htmlFor="email"
                className="block text-sm font-medium text-brand-deep mb-1"
                style={{ fontFamily: "var(--font-quicksand)" }}
              >
                Email address
              </label>
              <input
                id="email"
                type="email"
                name="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-xl border-2 border-brand-deep bg-white px-4 py-3 text-brand-deep placeholder:text-brand-deep/30 focus:outline-none focus:ring-2 focus:ring-brand-yellow"
                style={{ fontFamily: "var(--font-quicksand)" }}
                aria-describedby={errorMessage ? "sign-in-error" : undefined}
              />
            </div>

            {status === "error" && (
              <p
                id="sign-in-error"
                role="alert"
                className="text-sm text-rose-700 mb-4"
                style={{ fontFamily: "var(--font-quicksand)" }}
              >
                {errorMessage}
              </p>
            )}

            <button
              type="submit"
              disabled={status === "loading" || !email}
              className="w-full rounded-xl border-2 border-brand-deep bg-brand-yellow px-6 py-3 font-semibold text-brand-deep shadow-comic transition-opacity disabled:opacity-50"
              style={{ fontFamily: "var(--font-quicksand)" }}
            >
              {status === "loading" ? "Sending…" : "Send sign-in link"}
            </button>
          </form>
        )}

        {/* ── No-account explainer ─────────────────────────────────────────── */}
        <div
          className="mt-10 rounded-2xl border-2 border-brand-deep bg-white shadow-comic-sm p-6"
        >
          <h2
            className="text-lg text-brand-deep mb-2"
            style={{ fontFamily: "var(--font-fredoka)" }}
          >
            No account to create
          </h2>
          <p
            className="text-brand-deep/70 text-sm leading-relaxed"
            style={{ fontFamily: "var(--font-quicksand)" }}
          >
            You don't sign up here. Place an order for your child's video, and
            we'll automatically create an account for the email you use at
            checkout. From that point on, just enter that same email address
            above whenever you want to sign in. Every order you place is saved
            to the same account, so you can come back as many times as you like.
          </p>
        </div>

      </div>
    </main>
  );
}
