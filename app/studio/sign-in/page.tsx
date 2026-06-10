"use client";

/**
 * /studio/sign-in — staff sign-in (email + password against the `admins`
 * collection). Posts to Payload's REST login endpoint, which sets the same
 * payload-token cookie /admin uses; on success we land on the dashboard.
 * PUBLIC route — lives outside the (gated) group so the gate redirect can
 * never trap it. Password resets happen in /admin; no sign-up path exists.
 */
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

export default function StudioSignInPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("loading");
    try {
      const res = await fetch("/api/admins/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        setStatus("error");
        return;
      }
      router.push("/studio");
      router.refresh();
    } catch {
      setStatus("error");
    }
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col items-center justify-center px-6">
      <div className="w-full rounded-[28px] border-[3px] border-brand-deep bg-white p-8 shadow-comic-lg">
        <Image
          src="/mascot/builder-static.png"
          alt=""
          width={120}
          height={120}
          unoptimized
          className="mx-auto -mt-16 h-28 w-28 object-contain drop-shadow-[4px_4px_0_rgba(26,16,51,0.2)]"
        />
        <h1
          className="mt-2 text-center text-3xl text-brand-deep"
          style={{ fontFamily: "var(--font-fredoka)" }}
        >
          The studio
        </h1>
        <p
          className="mt-1 text-center text-sm text-brand-deep/70"
          style={{ fontFamily: "var(--font-quicksand)" }}
        >
          Sign in with your staff account.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
          <label className="flex flex-col gap-1 text-sm font-bold text-brand-deep">
            Email
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="rounded-xl border-2 border-brand-deep bg-brand-cream px-4 py-2.5 font-semibold outline-none focus:shadow-comic-sm"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-bold text-brand-deep">
            Password
            <input
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="rounded-xl border-2 border-brand-deep bg-brand-cream px-4 py-2.5 font-semibold outline-none focus:shadow-comic-sm"
            />
          </label>

          {status === "error" ? (
            <p role="alert" className="text-sm font-semibold text-brand-pink">
              That email and password did not match. Please try again.
            </p>
          ) : null}

          <button
            type="submit"
            disabled={status === "loading"}
            className="rounded-full border-2 border-brand-deep bg-brand-yellow px-6 py-3 font-bold text-brand-deep shadow-comic-sm transition-shadow hover:shadow-comic disabled:opacity-60"
            style={{ fontFamily: "var(--font-fredoka)" }}
          >
            {status === "loading" ? "Signing in..." : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
