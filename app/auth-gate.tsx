
"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";

const PUBLIC_PATHS = ["/login"];

type Rol = "eigenaar" | "docent" | "gast" | "lid";

type SessionResponse = {
  loggedIn?: boolean;
  rol?: Rol;
  username?: string;
  mustChangePassword?: boolean;
};

export function AuthGate({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  const [allowed, setAllowed] = useState(false);
  const [checking, setChecking] = useState(true);
  const [debug, setDebug] = useState("start");

  // ✅ voorkomt “blocked” screen tijdens redirect
  const redirectingRef = useRef(false);

  useEffect(() => {
    redirectingRef.current = false;
    let cancelled = false;
    const controller = new AbortController();

    function go(to: string, reason: string) {
      if (cancelled) return;

      redirectingRef.current = true;

      // Tijdens redirect blijven we in "checking" UI
      setAllowed(false);
      setChecking(true);
      setDebug(`redirect -> ${to} (${reason})`);

      router.replace(to);
    }

    async function run() {
      if (cancelled) return;

      setAllowed(false);
      setChecking(true);
      setDebug(`checking pathname=${pathname}`);

      // Publieke routes altijd toestaan
      if (PUBLIC_PATHS.includes(pathname)) {
        setAllowed(true);
        setChecking(false);
        setDebug("public path allowed");
        return;
      }

      // Timeout zodat je nooit eindeloos blijft hangen
      const timeout = setTimeout(() => controller.abort(), 8000);

      try {
        const res = await fetch("/api/session", {
          cache: "no-store",
          credentials: "include",
          signal: controller.signal,
        });

        const data = (await res.json().catch(() => null)) as SessionResponse | null;
        clearTimeout(timeout);

        if (!res.ok || !data?.loggedIn || !data?.rol) {
          go("/login", `not logged in (status=${res.status})`);
          return;
        }

        const isLid = data.rol === "lid";
        const must = data.mustChangePassword === true;

        // ✅ Lid moet wijzigen:
        // - /wachtwoord is toegestaan
        // - alle andere routes -> force naar /wachtwoord
        if (isLid && must) {
          if (pathname === "/wachtwoord") {
            setAllowed(true);
            setDebug(
              `allowed: on /wachtwoord with mustChangePassword (user=${data.username ?? "-"})`
            );
            return;
          }
          go("/wachtwoord", `mustChangePassword true for ${data.username ?? "-"}`);
          return;
        }

        // ✅ Lid hoeft niet te wijzigen maar staat nog op /wachtwoord -> terug naar /mijn
        if (isLid && !must && pathname === "/wachtwoord") {
          go("/mijn", `mustChangePassword false, leaving /wachtwoord (user=${data.username ?? "-"})`);
          return;
        }

        // Overig: gewoon toestaan
        setAllowed(true);
        setDebug(
          `allowed (rol=${data.rol}, must=${String(must)}, user=${data.username ?? "-"})`
        );
      } catch (e: any) {
        clearTimeout(timeout);

        if (e?.name === "AbortError") {
          go("/login", "session fetch timeout/abort");
          return;
        }

        go("/login", `session fetch error: ${String(e?.message || e)}`);
      } finally {
        // ✅ Belangrijk: als we aan het redirecten zijn, niet “checking” uitzetten
        if (!cancelled && !redirectingRef.current) {
          setChecking(false);
        }
      }
    }

    run();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [pathname, router]);

  // Tijdens checking of redirect altijd dit tonen (nooit "blocked" flash)
  if (checking) {
    return (
      <main className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6 text-center">
        <p className="text-gray-300 mb-3">Bezig met controleren…</p>
        <pre className="w-full max-w-xl text-left text-xs text-gray-300 bg-black/40 border border-zinc-800 rounded-lg p-3 overflow-auto">
          {debug}
        </pre>
      </main>
    );
  }

  if (!allowed) {
    // Fallback: dit hoort praktisch nooit meer te gebeuren, maar geen zwart scherm
    return (
      <main className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6 text-center">
        <p className="text-gray-300 mb-3">Toegang geblokkeerd.</p>
        <pre className="w-full max-w-xl text-left text-xs text-gray-300 bg-black/40 border border-zinc-800 rounded-lg p-3 overflow-auto">
          {debug}
        </pre>
        <button
          className="mt-4 text-gray-400 underline text-sm"
          onClick={() => router.replace("/login")}
        >
          Naar login
        </button>
      </main>
    );
  }

  return <>{children}</>;
}
