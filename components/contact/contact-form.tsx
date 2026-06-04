"use client";

import { useState, type FormEvent } from "react";

import { CONTACT_TOPICS, type ContactTopic } from "@/lib/contact";

type Status = "idle" | "loading" | "sent" | "error";

const FIELD =
  "w-full rounded-xl border-2 border-brand-deep bg-white px-4 py-3 text-brand-deep placeholder:text-brand-deep/30 focus:outline-none focus:ring-2 focus:ring-brand-yellow";
const LABEL = "block text-sm font-medium text-brand-deep mb-1";

export function ContactForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [topic, setTopic] = useState<ContactTopic>(CONTACT_TOPICS[0]);
  const [message, setMessage] = useState("");
  const [company, setCompany] = useState(""); // honeypot
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("loading");
    setErrorMessage("");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, email, topic, message, company }),
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (res.ok && data.ok) {
        setStatus("sent");
      } else {
        setStatus("error");
        setErrorMessage(
          data.error ?? "We couldn't send your message. Please try again in a moment.",
        );
      }
    } catch {
      setStatus("error");
      setErrorMessage("We couldn't reach our server. Please try again in a moment.");
    }
  }

  if (status === "sent") {
    return (
      <div
        role="status"
        className="rounded-2xl border-2 border-brand-deep bg-white p-6 shadow-comic"
      >
        <h3 className="mb-2 text-xl text-brand-deep" style={{ fontFamily: "var(--font-fredoka)" }}>
          Thanks — we've got your message
        </h3>
        <p className="text-brand-deep/70" style={{ fontFamily: "var(--font-quicksand)" }}>
          A real person will read it and reply to{" "}
          <strong className="text-brand-deep">{email}</strong>, usually within one business day.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate style={{ fontFamily: "var(--font-quicksand)" }}>
      {/* Honeypot — hidden from real users, catches bots. */}
      <div aria-hidden className="absolute left-[-9999px]">
        <label htmlFor="company">Company</label>
        <input
          id="company"
          name="company"
          tabIndex={-1}
          autoComplete="off"
          value={company}
          onChange={(e) => setCompany(e.target.value)}
        />
      </div>

      <div className="mb-4">
        <label htmlFor="contact-name" className={LABEL}>Your name</label>
        <input id="contact-name" type="text" required autoComplete="name"
          value={name} onChange={(e) => setName(e.target.value)}
          placeholder="Jane Doe" className={FIELD} />
      </div>

      <div className="mb-4">
        <label htmlFor="contact-email" className={LABEL}>Email address</label>
        <input id="contact-email" type="email" required autoComplete="email"
          value={email} onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com" className={FIELD} />
      </div>

      <div className="mb-4">
        <label htmlFor="contact-topic" className={LABEL}>What's this about?</label>
        <select id="contact-topic" value={topic}
          onChange={(e) => setTopic(e.target.value as ContactTopic)}
          className={FIELD}>
          {CONTACT_TOPICS.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>

      <div className="mb-4">
        <label htmlFor="contact-message" className={LABEL}>Message</label>
        <textarea id="contact-message" required rows={5}
          value={message} onChange={(e) => setMessage(e.target.value)}
          placeholder="Tell us how we can help…"
          aria-describedby={status === "error" ? "contact-error" : undefined}
          className={`${FIELD} resize-y`} />
      </div>

      {status === "error" && (
        <p id="contact-error" role="alert" className="mb-4 text-sm text-rose-700">
          {errorMessage}
        </p>
      )}

      <button type="submit" disabled={status === "loading" || !name || !email || !message}
        className="w-full rounded-xl border-2 border-brand-deep bg-brand-yellow px-6 py-3 font-semibold text-brand-deep shadow-comic transition-opacity disabled:opacity-50">
        {status === "loading" ? "Sending…" : "Send message"}
      </button>
    </form>
  );
}
