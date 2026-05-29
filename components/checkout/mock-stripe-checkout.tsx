"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import Image from "next/image";
import type { CheckoutProps } from "./types";

type Status = "form" | "processing" | "success";

/**
 * SIMULATION of a Stripe embedded checkout. Looks and behaves like a real
 * in-page Stripe Checkout (branded merchant panel + card form + processing +
 * success) but performs no network calls and charges nothing.
 *
 * To go live, replace this component with one that renders Stripe's
 * <EmbeddedCheckout> — keep the same `CheckoutProps` signature. See README.md.
 */
export function MockStripeCheckout({ open, cart, onClose }: CheckoutProps) {
  const [mounted, setMounted] = useState(false);
  const [status, setStatus] = useState<Status>("form");
  const [email, setEmail] = useState("");
  const [card, setCard] = useState("4242 4242 4242 4242");
  const [exp, setExp] = useState("12 / 34");
  const [cvc, setCvc] = useState("123");
  const [name, setName] = useState("");
  const [orderRef, setOrderRef] = useState("");
  const reduce = useReducedMotion();
  const panelRef = useRef<HTMLDivElement>(null);
  const labelId = useId();

  const currency = (cart.currency ?? "usd").toUpperCase();
  const money = (n: number) =>
    n.toLocaleString("en-US", { style: "currency", currency });

  useEffect(() => setMounted(true), []);

  // Reset to the form each time the dialog opens.
  useEffect(() => {
    if (open) setStatus("form");
  }, [open]);

  // Lock body scroll + Escape to close (not while processing).
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && status !== "processing") onClose();
    };
    window.addEventListener("keydown", onKey);
    panelRef.current?.focus();
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, status, onClose]);

  const pay = () => {
    setStatus("processing");
    window.setTimeout(
      () => {
        setOrderRef(
          "YFT-" + Math.floor(100000 + Math.random() * 900000).toString(),
        );
        setStatus("success");
      },
      reduce ? 250 : 1700,
    );
  };

  if (!mounted) return null;

  const dismiss = () => status !== "processing" && onClose();

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          {/* backdrop */}
          <div
            className="absolute inset-0 bg-brand-deep/70 backdrop-blur-sm"
            onClick={dismiss}
            aria-hidden
          />

          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={labelId}
            tabIndex={-1}
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: 16, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 260, damping: 26 }}
            className="relative grid w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-2xl outline-none ring-1 ring-brand-deep/10 md:grid-cols-2"
          >
            {/* TEST MODE ribbon */}
            <div className="absolute left-0 right-0 top-0 z-10 flex items-center justify-center gap-2 bg-amber-400 py-1 text-center text-[11px] font-black uppercase tracking-widest text-amber-950">
              Test mode · simulation — no real charge
            </div>

            {/* close */}
            <button
              type="button"
              onClick={dismiss}
              disabled={status === "processing"}
              aria-label="Close checkout"
              className="absolute right-3 top-7 z-20 flex h-8 w-8 items-center justify-center rounded-full bg-white/80 text-brand-deep transition hover:bg-white disabled:opacity-40 md:text-white md:hover:bg-white/20"
            >
              ✕
            </button>

            {/* LEFT — branded merchant / order summary */}
            <div className="flex flex-col bg-brand-deep p-7 pt-12 text-white sm:p-9 sm:pt-14">
              <div className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white">
                  <Image
                    src="/logo.png"
                    alt=""
                    width={120}
                    height={120}
                    unoptimized
                    className="h-7 w-7"
                  />
                </span>
                <span className="font-[family-name:var(--font-fredoka)] font-bold">
                  Yours Fairy Tale
                </span>
              </div>

              <p className="mt-8 text-sm font-semibold text-white/55">
                Your personalized storybook
              </p>
              <p className="mt-1 font-[family-name:var(--font-fredoka)] text-5xl font-bold text-brand-yellow">
                {money(cart.total)}
              </p>

              <ul className="mt-7 space-y-2.5 text-sm">
                {cart.items.map((item) => (
                  <li key={item.label} className="flex justify-between gap-3 text-white/80">
                    <span>{item.label}</span>
                    <span className="font-semibold tabular-nums">{money(item.amount)}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-5 flex justify-between gap-3 border-t border-white/15 pt-4 text-sm font-bold">
                <span>Total due</span>
                <span className="tabular-nums">{money(cart.total)}</span>
              </div>

              <p className="mt-auto pt-8 text-xs font-medium text-white/40">
                Free shipping included. A full preview is sent before anything prints.
              </p>
            </div>

            {/* RIGHT — payment form / success */}
            <div className="p-7 pt-12 sm:p-9 sm:pt-14">
              <AnimatePresence mode="wait">
                {status === "success" ? (
                  <motion.div
                    key="success"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex h-full flex-col items-center justify-center text-center"
                  >
                    <motion.span
                      initial={reduce ? false : { scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 300, damping: 16 }}
                      className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-blue text-3xl text-brand-deep"
                    >
                      ✓
                    </motion.span>
                    <h2
                      id={labelId}
                      className="mt-5 font-[family-name:var(--font-fredoka)] text-2xl font-bold text-brand-deep"
                    >
                      Payment successful
                    </h2>
                    <p className="mt-2 text-sm font-medium text-brand-deep/65">
                      Order {orderRef}. A confirmation and your book preview are on the way to{" "}
                      {email.trim() ? email.trim() : "your inbox"}.
                    </p>
                    <button
                      type="button"
                      onClick={onClose}
                      className="mt-7 w-full rounded-xl bg-brand-deep py-3.5 text-sm font-black uppercase tracking-wide text-white transition hover:opacity-90"
                    >
                      Done
                    </button>
                  </motion.div>
                ) : (
                  <motion.div
                    key="form"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    <h2
                      id={labelId}
                      className="font-[family-name:var(--font-fredoka)] text-xl font-bold text-brand-deep"
                    >
                      Pay with card
                    </h2>

                    <div className="mt-5 space-y-4">
                      <Field label="Email">
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="you@email.com"
                          autoComplete="email"
                          className="w-full rounded-lg border border-brand-deep/15 px-3 py-2.5 text-sm text-brand-deep outline-none transition placeholder:text-brand-deep/35 focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/30"
                        />
                      </Field>

                      <Field label="Card information">
                        <div className="overflow-hidden rounded-lg border border-brand-deep/15 focus-within:border-brand-blue focus-within:ring-2 focus-within:ring-brand-blue/30">
                          <input
                            value={card}
                            onChange={(e) => setCard(e.target.value)}
                            inputMode="numeric"
                            aria-label="Card number"
                            className="w-full border-0 px-3 py-2.5 text-sm text-brand-deep outline-none placeholder:text-brand-deep/35"
                          />
                          <div className="flex border-t border-brand-deep/15">
                            <input
                              value={exp}
                              onChange={(e) => setExp(e.target.value)}
                              aria-label="Expiry"
                              placeholder="MM / YY"
                              className="w-1/2 border-0 border-r border-brand-deep/15 px-3 py-2.5 text-sm text-brand-deep outline-none placeholder:text-brand-deep/35"
                            />
                            <input
                              value={cvc}
                              onChange={(e) => setCvc(e.target.value)}
                              aria-label="CVC"
                              placeholder="CVC"
                              className="w-1/2 border-0 px-3 py-2.5 text-sm text-brand-deep outline-none placeholder:text-brand-deep/35"
                            />
                          </div>
                        </div>
                      </Field>

                      <Field label="Name on card">
                        <input
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="Full name"
                          autoComplete="cc-name"
                          className="w-full rounded-lg border border-brand-deep/15 px-3 py-2.5 text-sm text-brand-deep outline-none transition placeholder:text-brand-deep/35 focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/30"
                        />
                      </Field>

                      <Field label="Country">
                        <select
                          defaultValue="US"
                          className="w-full appearance-none rounded-lg border border-brand-deep/15 bg-white px-3 py-2.5 text-sm text-brand-deep outline-none transition focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/30"
                        >
                          <option value="US">United States</option>
                          <option value="GB">United Kingdom</option>
                          <option value="PL">Poland</option>
                          <option value="CA">Canada</option>
                          <option value="AU">Australia</option>
                        </select>
                      </Field>
                    </div>

                    <button
                      type="button"
                      onClick={pay}
                      disabled={status === "processing"}
                      className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-brand-deep py-3.5 text-sm font-black uppercase tracking-wide text-white transition hover:opacity-90 disabled:opacity-80"
                    >
                      {status === "processing" ? (
                        <>
                          <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                          Processing…
                        </>
                      ) : (
                        <>Pay {money(cart.total)}</>
                      )}
                    </button>

                    <p className="mt-4 text-center text-[11px] font-medium text-brand-deep/40">
                      Powered by Stripe · this is a demo, no card is charged
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-bold text-brand-deep/60">{label}</span>
      {children}
    </label>
  );
}
