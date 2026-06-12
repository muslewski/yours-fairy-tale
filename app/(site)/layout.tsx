import type { Metadata, Viewport } from "next";
import { Fredoka, Quicksand, Fraunces } from "next/font/google";
import "./globals.css";
import { SitePreloader } from "@/components/site-preloader";
import { ScrollToTop } from "@/components/scroll-to-top";

const fredoka = Fredoka({
  variable: "--font-fredoka",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const quicksand = Quicksand({
  variable: "--font-quicksand",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  axes: ["SOFT", "opsz"],
});

const TITLE = "Yours Fairy Tale — Personalized animated videos for every child";
const DESCRIPTION =
  "Create a custom animated fairy tale starring your child. Choose an adventure, a length, and the level of detail.";

export const metadata: Metadata = {
  metadataBase: new URL("https://www.yoursfairytale.com"),
  title: TITLE,
  description: DESCRIPTION,
  applicationName: "Yours Fairy Tale",
  keywords: [
    "personalized video for kids",
    "animated fairy tale",
    "custom children's story",
    "personalized gift for children",
    "kids video keepsake",
  ],
  alternates: { canonical: "/" },
  // The apple-mobile-web-app-title (home-screen name). Short on purpose.
  appleWebApp: { capable: true, title: "Fairy Tale", statusBarStyle: "default" },
  openGraph: {
    type: "website",
    siteName: "Yours Fairy Tale",
    title: TITLE,
    description: DESCRIPTION,
    url: "https://www.yoursfairytale.com",
    locale: "en_US",
    // og:image is supplied by app/opengraph-image.tsx (and per-post overrides).
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    // twitter:image is supplied by app/twitter-image.tsx (and per-post overrides).
  },
};

export const viewport: Viewport = {
  themeColor: "#fff9ee",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body
        className={`${fredoka.variable} ${quicksand.variable} ${fraunces.variable} min-h-full antialiased`}
      >
        <SitePreloader />
        <ScrollToTop />
        {children}
      </body>
    </html>
  );
}
