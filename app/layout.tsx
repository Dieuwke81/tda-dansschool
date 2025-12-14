
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthGate } from "./auth-gate";
import { headers } from "next/headers";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "TDA Dansschool",
  description: "Beheeromgeving voor Tata Dans Agency",
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
    apple: "/favicon.ico",
  },
  openGraph: {
    title: "TDA Dansschool",
    description: "Beheeromgeving voor Tata Dans Agency",
    images: ["/og-image.png"],
    type: "website",
    locale: "nl_NL",
    url: "https://tda-chi.vercel.app/",
  },
  twitter: {
    card: "summary_large_image",
    title: "TDA Dansschool",
    description: "Beheeromgeving voor Tata Dans Agency",
    images: ["/og-image.png"],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // ✅ AuthGate UIT op /wachtwoord, zodat je nooit in een redirect-loop komt
  const h = headers();
  const pathname = h.get("x-invoke-path") || h.get("next-url") || "";
  const noAuthGate = pathname.startsWith("/wachtwoord");

  return (
    <html lang="nl">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#000000" />
        <link rel="apple-touch-icon" href="/android-chrome-512x512.png" />
      </head>

      <body className={`${inter.variable} antialiased bg-black text-white`}>
        {noAuthGate ? children : <AuthGate>{children}</AuthGate>}
      </body>
    </html>
  );
}
