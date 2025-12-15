
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

type Rol = "eigenaar" | "docent" | "gast" | "lid";

export default function HomePage() {
  const router = useRouter();
  const pathname = usePathname();

  const [rol, setRol] = useState<Rol | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function check() {
      try {
        const res = await fetch("/api/session", {
          cache: "no-store",
          credentials: "include",
        });
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
      await fetch("/api/logout", { method: "POST", credentials: "include" });
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

  const isActive = (href: string) =>
    pathname === href || pathname?.startsWith(href + "/");

  const baseCard =
    "relative overflow-hidden rounded-2xl border px-7 py-4 font-semibold transition-all duration-200 select-none";
  const activeGlow =
    "ring-1 ring-white/15 shadow-[0_0_0_1px_rgba(255,255,255,0.10),0_10px_40px_rgba(236,72,153,0.18)]";
  const inactiveGlow =
    "shadow-[0_0_0_1px_rgba(255,255,255,0.06),0_8px_30px_rgba(0,0,0,0.55)]";

  const ledenActive = isActive("/leden");
  const lessenActive = isActive("/lessen");

  return (
    <main className="min-h-screen bg-black text-white flex flex-col items-center justify-center px-6 text-center">
      {/* subtiele achtergrond glow */}
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute left-1/2 top-24 h-[420px] w-[420px] -translate-x-1/2 rounded-full bg-pink-500/10 blur-3xl" />
        <div className="absolute left-1/2 top-56 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-white/5 blur-3xl" />
      </div>

      <img
        src="/logo.png"
        alt="TDA Logo"
        className="w-80 md:w-96 mb-8 drop-shadow-[0_14px_40px_rgba(0,0,0,0.70)]"
      />

      <h1 className="text-white text-4xl md:text-5xl font-extrabold tracking-tight leading-tight">
        Tati&apos;s Dance Agency
      </h1>

      {rol && (
        <p className="mt-4 text-sm text-gray-400">
          Ingelogd als{" "}
          <span className="text-pink-400 font-semibold">{rol}</span>
        </p>
      )}

      {isAdmin ? (
        <div className="mt-10 flex gap-4 mb-10">
          <Link
            href="/leden"
            aria-current={ledenActive ? "page" : undefined}
            className={[
              baseCard,
              "bg-pink-500 text-black border-pink-400/50",
              ledenActive ? activeGlow : inactiveGlow,
              "hover:bg-pink-400 active:scale-[0.99]",
            ].join(" ")}
          >
            <span className="relative z-10">Leden</span>
          </Link>

          <Link
            href="/lessen"
            aria-current={lessenActive ? "page" : undefined}
            className={[
              baseCard,
              "bg-zinc-950/40 text-white border-zinc-700",
              lessenActive ? activeGlow : inactiveGlow,
              "hover:border-pink-500/60 hover:bg-pink-500/10 active:scale-[0.99]",
            ].join(" ")}
          >
            <span className="relative z-10 text-pink-400">Lesgroepen</span>
          </Link>
        </div>
      ) : (
        <p className="text-gray-400 mt-8 mb-10 text-sm">
          Je hebt geen beheerrechten op deze startpagina.
        </p>
      )}

      <button
        onClick={uitloggen}
        className="text-gray-400 underline text-sm hover:text-gray-200 transition"
      >
        Uitloggen
      </button>
    </main>
  );
}
