"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function HomePage() {
  const router = useRouter();

  // 🔒 Bij het openen checken of iemand is ingelogd
  useEffect(() => {
    if (typeof window === "undefined") return;

    const ingelogd = window.localStorage.getItem("ingelogd");

    // Als niet ingelogd -> naar /login
    if (ingelogd !== "ja") {
      router.push("/login");
    }
  }, [router]);

  // 🔓 Uitlog-knop: haalt de flag weg en stuurt terug naar login
  function handleLogout() {
    if (typeof window === "undefined") return;

    window.localStorage.removeItem("ingelogd");
    router.push("/login");
  }

  return (
    <main className="min-h-screen bg-black text-white flex flex-col items-center justify-center px-6 py-10">
      {/* Logo */}
      <div className="mb-8">
        <Image
          src="/logo.png"
          alt="Tati's Dance Agency logo"
          width={260}
          height={260}
          priority
        />
      </div>

      {/* Titel + subtitel */}
      <h1 className="text-3xl md:text-4xl font-bold text-pink-500 mb-2 text-center">
        TDA Dansschool
      </h1>
      <p className="text-gray-300 mb-8 text-center max-w-md">
        Beheeromgeving voor leden en lesgroepen
      </p>

      {/* Navigatie-knoppen */}
      <div className="flex gap-4 mb-6">
        <Link
          href="/leden"
          className="px-6 py-3 rounded-full bg-pink-500 text-black font-semibold hover:bg-pink-400 transition-colors"
        >
          Leden
        </Link>
        <Link
          href="/lessen"
          className="px-6 py-3 rounded-full border border-pink-500 text-pink-500 font-semibold hover:bg-pink-500 hover:text-black transition-colors"
        >
          Lesgroepen
        </Link>
      </div>

      {/* Uitlog-knop onderaan */}
      <button
        onClick={handleLogout}
        className="mt-4 text-sm text-gray-400 underline underline-offset-2"
      >
        Uitloggen
 "use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function HomePage() {
  const router = useRouter();
  const [rol, setRol] = useState<string | null>(null);

  // Rol ophalen uit localStorage
  useEffect(() => {
    if (typeof window === "undefined") return;
    const ingelogd = localStorage.getItem("ingelogd");
    const opgeslagenRol = localStorage.getItem("rol");
    if (ingelogd !== "ja") {
      router.push("/login");
    } else {
      setRol(opgeslagenRol);
    }
  }, [router]);

  // Uitloggen
  function handleLogout() {
    localStorage.removeItem("ingelogd");
    localStorage.removeItem("rol");
    router.push("/login");
  }

  return (
    <main className="min-h-screen bg-black text-white flex flex-col items-center justify-center px-6 py-10">
      {/* Logo */}
      <div className="mb-8">
        <Image src="/logo.png" alt="TDA logo" width={220} height={220} priority />
      </div>

      {/* Titel */}
      <h1 className="text-3xl md:text-4xl font-bold text-pink-500 mb-2">
        TDA Dansschool
      </h1>
      <p className="text-gray-300 mb-8 text-center max-w-md">
        Beheeromgeving voor leden en lesgroepen
      </p>

      {/* Huidige rol */}
      {rol && (
        <p className="text-sm text-gray-400 mb-4">
          Ingelogd als: <span className="text-pink-400 font-semibold">{rol}</span>
        </p>
      )}

      {/* Navigatie */}
      <div className="flex gap-4 mb-8">
        <Link
          href="/leden"
          className="px-6 py-3 rounded-full bg-pink-500 text-black font-semibold hover:bg-pink-400 transition-colors"
        >
          Leden
        </Link>
        <Link
          href="/lessen"
          className="px-6 py-3 rounded-full border border-pink-500 text-pink-500 font-semibold hover:bg-pink-500 hover:text-black transition-colors"
        >
          Lesgroepen
        </Link>
      </div>

      {/* Uitloggen */}
      <button
        onClick={handleLogout}
        className="text-sm text-gray-400 underline underline-offset-2 hover:text-pink-400"
      >
        Uitloggen
      </button>
    </main>
  );
}     </button>
    </main>
  );
}