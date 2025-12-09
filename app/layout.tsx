import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
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
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="nl">
      <head>
        {/* PWA / app-icon instellingen */}
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#000000" />
        <link rel="apple-touch-icon" href="/android-chrome-512x512.png" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-black text-white`}
      >
        {children}
      </body>
    </html>
  );
}
