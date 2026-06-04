/**
 * Shared Open Graph / Twitter image rendering (next/og + Satori).
 *
 * One brand frame, two entry points:
 *   - renderSiteOg()  — the site-wide social card (home, series, contact, etc.)
 *   - renderPostOg()  — per Journal post, with the post title baked in.
 *
 * Fonts are bundled in `assets/` (Fredoka 400/600, woff = Satori-compatible) and
 * the brand images are inlined as data URIs so generation needs no network and
 * works at build time. These routes are statically optimized.
 */
import { ImageResponse } from "next/og";
import type { ReactNode } from "react";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const OG_SIZE = { width: 1200, height: 630 };
export const OG_CONTENT_TYPE = "image/png";

const DEEP = "#1a1033";
const CREAM = "#fff9ee";
const YELLOW = "#faca23";

async function loadFonts() {
  const [r400, r600] = await Promise.all([
    readFile(join(process.cwd(), "assets/Fredoka-400.woff")),
    readFile(join(process.cwd(), "assets/Fredoka-600.woff")),
  ]);
  return [
    { name: "Fredoka", data: r400, weight: 400 as const, style: "normal" as const },
    { name: "Fredoka", data: r600, weight: 600 as const, style: "normal" as const },
  ];
}

async function dataUri(publicRelPath: string): Promise<string> {
  const buf = await readFile(join(process.cwd(), "public", publicRelPath));
  return `data:image/png;base64,${buf.toString("base64")}`;
}

/** The cream page + thick comic frame both cards share. */
function Frame({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        backgroundColor: CREAM,
        padding: 44,
      }}
    >
      <div
        style={{
          position: "relative",
          flex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          backgroundColor: "#ffffff",
          border: `8px solid ${DEEP}`,
          borderRadius: 36,
          padding: 60,
          overflow: "hidden",
        }}
      >
        {children}
      </div>
    </div>
  );
}

function Wordmark({ logo, label }: { logo: string; label?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center" }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={logo} width={60} height={60} alt="" />
      <span
        style={{
          fontFamily: "Fredoka",
          fontWeight: 600,
          fontSize: 32,
          color: DEEP,
          marginLeft: 16,
        }}
      >
        Yours Fairy Tale
      </span>
      {label ? (
        <span
          style={{
            fontFamily: "Fredoka",
            fontWeight: 400,
            fontSize: 22,
            color: DEEP,
            opacity: 0.55,
            marginLeft: 16,
          }}
        >
          {label}
        </span>
      ) : null}
    </div>
  );
}

export async function renderSiteOg() {
  const [fonts, logo, astronaut] = await Promise.all([
    loadFonts(),
    dataUri("logo.png"),
    dataUri("astronaut.png"),
  ]);

  return new ImageResponse(
    (
      <Frame>
        <Wordmark logo={logo} />

        <div style={{ display: "flex", flexDirection: "column", maxWidth: 740 }}>
          <div
            style={{
              display: "flex",
              fontFamily: "Fredoka",
              fontWeight: 600,
              fontSize: 70,
              lineHeight: 1.05,
              color: DEEP,
            }}
          >
            An animated fairy tale made for them.
          </div>
          <div
            style={{
              display: "flex",
              fontFamily: "Fredoka",
              fontWeight: 400,
              fontSize: 30,
              color: DEEP,
              opacity: 0.7,
              marginTop: 22,
            }}
          >
            Personalized animated videos starring your child.
          </div>
        </div>

        <div style={{ display: "flex" }}>
          <div
            style={{
              display: "flex",
              backgroundColor: YELLOW,
              border: `4px solid ${DEEP}`,
              borderRadius: 14,
              padding: "12px 22px",
              fontFamily: "Fredoka",
              fontWeight: 600,
              fontSize: 26,
              color: DEEP,
            }}
          >
            40,000+ children already starring
          </div>
        </div>

        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={astronaut}
          width={440}
          height={440}
          alt=""
          style={{ position: "absolute", right: -36, bottom: -48 }}
        />
      </Frame>
    ),
    { ...OG_SIZE, fonts },
  );
}

export async function renderPostOg(title: string, category?: string) {
  const [fonts, logo] = await Promise.all([loadFonts(), dataUri("logo.png")]);

  return new ImageResponse(
    (
      <Frame>
        <Wordmark logo={logo} label="The Journal" />

        <div style={{ display: "flex", flexDirection: "column", maxWidth: 980 }}>
          {category ? (
            <div
              style={{
                display: "flex",
                fontFamily: "Fredoka",
                fontWeight: 600,
                fontSize: 24,
                color: DEEP,
                opacity: 0.6,
                marginBottom: 16,
                textTransform: "uppercase",
              }}
            >
              {category}
            </div>
          ) : null}
          <div
            style={{
              display: "flex",
              fontFamily: "Fredoka",
              fontWeight: 600,
              fontSize: title.length > 52 ? 56 : 66,
              lineHeight: 1.08,
              color: DEEP,
            }}
          >
            {title}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            fontFamily: "Fredoka",
            fontWeight: 400,
            fontSize: 26,
            color: DEEP,
            opacity: 0.6,
          }}
        >
          yoursfairytale.com
        </div>
      </Frame>
    ),
    { ...OG_SIZE, fonts },
  );
}
