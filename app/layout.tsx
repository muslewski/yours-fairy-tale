import type { Metadata } from "next";
import { Fredoka, Quicksand, Fraunces } from "next/font/google";
import "./globals.css";

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

export const metadata: Metadata = {
  title: "Yours Fairy Tale — Personalized animated videos for every child",
  description:
    "Create a custom animated fairy tale starring your child. Choose an adventure, a length, and the level of detail.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body
        className={`${fredoka.variable} ${quicksand.variable} ${fraunces.variable} min-h-full antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
