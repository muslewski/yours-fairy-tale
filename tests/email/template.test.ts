import { expect, test } from "vitest";
import { renderBrandedEmail, emailParagraphs } from "@/lib/email-template";

test("renders heading, preheader, footer tagline", () => {
  const html = renderBrandedEmail({
    preheader: "Peek me in the inbox",
    heading: "Your order is confirmed",
    bodyHtml: emailParagraphs(["Thank you for your order."]),
  });
  expect(html).toContain("Your order is confirmed");
  expect(html).toContain("Peek me in the inbox");
  expect(html).toContain("A keepsake they will ask for again and again.");
  expect(html).toContain("hello@yoursfairytale.com");
});

test("renders a CTA button with label + href", () => {
  const html = renderBrandedEmail({
    preheader: "p", heading: "h", bodyHtml: "<p>x</p>",
    cta: { label: "Sign in", href: "https://yoursfairytale.com/sign-in" },
  });
  expect(html).toContain("Sign in");
  expect(html).toContain('href="https://yoursfairytale.com/sign-in"');
});

test("escapes dangerous heading text", () => {
  const html = renderBrandedEmail({
    preheader: "p", heading: "<script>alert(1)</script>", bodyHtml: "<p>x</p>",
  });
  expect(html).not.toContain("<script>alert(1)</script>");
  expect(html).toContain("&lt;script&gt;");
});

test("accent maps to brand hex (pink)", () => {
  const html = renderBrandedEmail({ preheader: "p", heading: "h", bodyHtml: "<p>x</p>", accent: "pink" });
  expect(html).toContain("#f042d2");
});

test("emailParagraphs escapes and wraps each line", () => {
  const out = emailParagraphs(["a & b", "second"]);
  expect(out).toContain("a &amp; b");
  expect(out.match(/<p /g)?.length).toBe(2);
});
