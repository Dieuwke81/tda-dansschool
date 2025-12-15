
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Rol = "eigenaar" | "docent" | "gast" | "lid";

export default function HomePage() {
  const router = useRouter();
  const [rol, setRol] = useState<Rol | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function check() {
      try {
        const res = await fetch("/api/session", { cache: "no-store" });
        const data = await res.json().catch(() => null);

        if (!res.ok || !data?.loggedIn) {
          if (!cancelled) router.replace("/login");
          return;
        }

        const r: Rol = (data?.rol ?? "gast") as Rol;

        if (r === "lid") {
          if (!cancelled) router.replace("/mijn");
          return;
        }

        if (!cancelled) {
          setRol(r);
          setIsCheckingAuth(false);
        }
      } catch {
        if (!cancelled) router.replace("/login");
      }
    }

    check();
    return () => {
      cancelled = true;
    };
  }, [router]);

  async function uitloggen() {
    try {
      await fetch("/api/logout", { method: "POST" });
    } catch {}

    if (typeof window !== "undefined") {
      localStorage.removeItem("ingelogd");
      localStorage.removeItem("rol");
      localStorage.removeItem("tda_ingelogd");
    }

    router.replace("/login");
  }

  if (isCheckingAuth) {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center">
        <p className="text-gray-400">Bezig met controleren...</p>
      </main>
    );
  }

  const isAdmin = rol === "eigenaar" || rol === "docent";

  return (
    <main className="min-h-screen bg-black text-white flex flex-col items-center justify-center px-6 text-center">
      <img
        src="/logo.png"
        alt="TDA Logo"
        className="w-72 md:w-80 mb-8 drop-shadow-[0_10px_30px_rgba(0,0,0,0.6)]"
      />

      <h1 className="text-white text-4xl md:text-5xl font-extrabold tracking-tight leading-tight">
        Tati&apos;s Dance Agency
      </h1>

      <div className="h-6" />

      {rol && (
        <p className="text-sm text-gray-400 mb-6">
          Ingelogd als{" "}
          <span className="text-pink-400 font-semibold">{rol}</span>
        </p>
      )}

      {isAdmin ? (
        <div className="flex gap-4 mb-10">
          <Link
            href="/leden"
            className="bg-pink-500 text-black font-semibold px-7 py-3 rounded-full hover:bg-pink-600 transition"
          >
            Leden
          </Link>

          <Link
            href="/lessen"
            className="border border-pink-500 text-pink-500 font-semibold px-7 py-3 rounded-full hover:bg-pink-500/10 transition"
          >
            Lesgroepen
          </Link>
        </div>
      ) : (
        <p className="text-gray-400 mb-8 text-sm">
          Je hebt geen beheerrechten op deze startpagina.
        </p>
      )}

      <button onClick={uitloggen} className="text-gray-400 underline text-sm">
        Uitloggen
      </button>
    </main>
  );
}
