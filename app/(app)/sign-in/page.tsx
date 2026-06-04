"use client";

/**
 * /sign-in — magic-link sign-in page (split-screen design).
 *
 * PUBLIC route — lives outside the gated /app route group so it is never
 * caught by the redirect in app/(app)/app/layout.tsx.
 *
 * Layout: one comic card with two columns (mirrors the configurator). Left is a
 * brand-deep dotted "welcome back" panel with the astronaut; right is the form +
 * the no-account explainer. The left panel is hidden below lg (form-focused on
 * mobile).
 *
 * Copy written per the brand-voice guide: calm, warm, parent-facing, sentence
 * case, American English, no hype/SFX. The no-account explainer conveys that
 * there is no sign-up here — the parent places an order and a sign-in link goes
 * to the email used at checkout; every order is saved to that same account.
 */

import Image from "next/image";
import Link from "next/link";
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
    <div className="w-full max-w-4xl">
      <div className="grid overflow-hidden rounded-[28px] border-[3px] border-brand-deep shadow-comic-lg lg:grid-cols-2">
        {/* ── Left: brand welcome panel (lg+ only) ───────────────────────────── */}
        <div
          className="relative hidden flex-col bg-brand-deep p-9 text-white sm:p-10 lg:flex"
          style={{
            backgroundImage:
              "radial-gradient(circle at 10px 10px, rgba(255,249,238,0.10) 2px, transparent 0)",
            backgroundSize: "28px 28px",
          }}
        >
          <p
            className="text-xs font-bold uppercase tracking-widest text-white/60"
            style={{ fontFamily: "var(--font-quicksand)" }}
          >
            Yours Fairy Tale
          </p>
          <p className="mt-6 font-[family-name:var(--font-fredoka)] text-5xl font-bold leading-[0.95]">
            Welcome back.
          </p>
          <p
            className="mt-4 max-w-xs text-white/75"
            style={{ fontFamily: "var(--font-quicksand)" }}
          >
            Your stories live here. Sign in with the email you used at checkout, and
            pick up right where you left off.
          </p>
          <div className="pointer-events-none mt-auto flex justify-center">
            <Image
              src="/astronaut.png"
              alt=""
              width={820}
              height={820}
              unoptimized
              priority
              className="-mb-20 -ml-6 h-[42rem] w-[42rem] -rotate-[12deg] object-contain drop-shadow-[10px_10px_0_rgba(0,0,0,0.3)] xl:-mb-24 xl:h-[48rem] xl:w-[48rem]"
            />
          </div>
        </div>

        {/* ── Right: form + no-account explainer ─────────────────────────────── */}
        <div className="bg-brand-cream p-8 sm:p-10 lg:border-l-[3px] lg:border-brand-deep">
          <h1
            className="text-3xl text-brand-deep"
            style={{ fontFamily: "var(--font-fredoka)" }}
          >
            Sign in
          </h1>
          <p
            className="mt-2 text-brand-deep/70"
            style={{ fontFamily: "var(--font-quicksand)" }}
          >
            We'll send a sign-in link to the email you used at checkout.
          </p>

          <div className="mt-7">
            {status === "sent" ? (
              /* ── Success state ───────────────────────────────────────────── */
              <div className="rounded-2xl border-2 border-brand-deep bg-white shadow-comic p-6">
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
                  <strong className="text-brand-deep">{email}</strong>. Click the link
                  in that email to open your account. The link expires after a short
                  while, so check your inbox soon.
                </p>
              </div>
            ) : (
              /* ── Sign-in form ────────────────────────────────────────────── */
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
          </div>

          {/* ── No-account explainer ───────────────────────────────────────── */}
          <div className="mt-8 rounded-2xl border-2 border-brand-deep bg-white shadow-comic-sm p-6">
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
              You don't sign up here. Place an order for your child's video, and we'll
              automatically create an account for the email you use at checkout. From
              that point on, just enter that same email address above whenever you want
              to sign in. Every order you place is saved to the same account, so you can
              come back as many times as you like.
            </p>
            <Link
              href="/#build"
              className="mt-5 inline-flex items-center gap-1 rounded-xl border-2 border-brand-deep bg-brand-yellow px-5 py-2.5 font-semibold text-brand-deep shadow-comic-sm transition-shadow hover:shadow-comic"
              style={{ fontFamily: "var(--font-quicksand)" }}
            >
              Place an order →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
