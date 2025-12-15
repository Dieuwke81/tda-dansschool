
import type { Metadata } from "next";
import { Inter, Poppins } from "next/font/google";
import "./globals.css";
import { AuthGate } from "./auth-gate";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-poppins",
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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="nl">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#000000" />
        <link rel="apple-touch-icon" href="/android-chrome-512x512.png" />
      </head>

      <body
        className={`${inter.variable} ${poppins.variable} antialiased bg-black text-white font-sans`}
      >
        <AuthGate>{children}</AuthGate>
      </body>
    </html>
  );
}
