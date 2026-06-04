/**
 * The single source of email chrome. Every transactional email renders through
 * renderBrandedEmail so they all carry the brand and stay email-client safe
 * (table layout, inline styles, hosted logo, hex literals — no CSS vars).
 */
import { escapeHtml } from "@/lib/utils";

export type EmailAccent = "yellow" | "pink" | "blue";

const DEEP = "#1a1033";
const CREAM = "#fff9ee";
const LOGO_URL = "https://yoursfairytale.com/logo.png";
const FONT = "'Trebuchet MS', Verdana, -apple-system, sans-serif";

const ACCENT_HEX: Record<EmailAccent, string> = {
  yellow: "#faca23",
  pink: "#f042d2",
  blue: "#17c7e2",
};
// Text color with adequate contrast on each accent button background.
const ACCENT_TEXT: Record<EmailAccent, string> = {
  yellow: DEEP,
  pink: "#ffffff",
  blue: DEEP,
};

export interface BrandedEmailOptions {
  preheader: string;
  heading: string;
  bodyHtml: string; // trusted markup assembled from escaped pieces (use emailParagraphs)
  accent?: EmailAccent;
  cta?: { label: string; href: string };
  footerNote?: string;
}

/** Escape each line and wrap as a paragraph. Use for plain-text email bodies. */
export function emailParagraphs(lines: string[]): string {
  return lines
    .map((l) => `<p style="margin: 0 0 16px;">${escapeHtml(l)}</p>`)
    .join("\n");
}

export function renderBrandedEmail(opts: BrandedEmailOptions): string {
  const accent = opts.accent ?? "yellow";
  const accentHex = ACCENT_HEX[accent];
  const btnText = ACCENT_TEXT[accent];

  const button = opts.cta
    ? `
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin: 28px auto 4px;">
                <tr>
                  <td align="center" bgcolor="${accentHex}" style="border-radius: 12px; border: 3px solid ${DEEP};">
                    <a href="${opts.cta.href}" target="_blank" style="display: inline-block; padding: 14px 28px; font-family: ${FONT}; font-size: 16px; font-weight: bold; color: ${btnText}; text-decoration: none;">${escapeHtml(opts.cta.label)}</a>
                  </td>
                </tr>
              </table>`
    : "";

  const footerNote = opts.footerNote
    ? `<p style="margin: 0 0 12px; font-family: ${FONT}; font-size: 14px; line-height: 1.5; color: ${DEEP};">${escapeHtml(opts.footerNote)}</p>`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="x-apple-disable-message-reformatting" />
  <title>${escapeHtml(opts.heading)}</title>
</head>
<body style="margin: 0; padding: 0; background-color: ${CREAM};">
  <span style="display:none !important; visibility:hidden; opacity:0; color:transparent; height:0; width:0; max-height:0; max-width:0; overflow:hidden;">${escapeHtml(opts.preheader)}</span>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: ${CREAM};">
    <tr>
      <td align="center" style="padding: 28px 16px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width: 600px; max-width: 600px;">
          <tr>
            <td align="center" bgcolor="${DEEP}" style="border-radius: 16px 16px 0 0; padding: 22px;">
              <img src="${LOGO_URL}" width="36" height="36" alt="Yours Fairy Tale" style="vertical-align: middle; border: 0; display: inline-block;" />
              <span style="font-family: ${FONT}; font-size: 18px; font-weight: bold; color: #ffffff; vertical-align: middle; padding-left: 10px;">Yours Fairy Tale</span>
            </td>
          </tr>
          <tr><td bgcolor="${accentHex}" style="height: 6px; line-height: 6px; font-size: 0;">&nbsp;</td></tr>
          <tr>
            <td bgcolor="#ffffff" style="border-left: 3px solid ${DEEP}; border-right: 3px solid ${DEEP}; border-bottom: 3px solid ${DEEP}; border-radius: 0 0 16px 16px; padding: 36px 32px;">
              <h1 style="margin: 0 0 16px; font-family: ${FONT}; font-size: 26px; line-height: 1.15; color: ${DEEP};">${escapeHtml(opts.heading)}</h1>
              <div style="font-family: ${FONT}; font-size: 16px; line-height: 1.6; color: ${DEEP};">
                ${opts.bodyHtml}
              </div>
              ${button}
            </td>
          </tr>
          <tr>
            <td align="center" style="padding: 24px 24px 8px;">
              ${footerNote}
              <p style="margin: 0 0 6px; font-family: ${FONT}; font-size: 13px; line-height: 1.5; color: ${DEEP};">A keepsake they will ask for again and again.</p>
              <p style="margin: 0; font-family: ${FONT}; font-size: 13px; line-height: 1.5; color: ${DEEP};">Questions? Just reply, or write to <a href="mailto:hello@yoursfairytale.com" style="color: ${DEEP};">hello@yoursfairytale.com</a>.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
