
"use client";

import { useEffect, useState, type ReactNode } from "react";
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
  const [debug, setDebug] = useState("start");

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    function redirect(to: string, reason: string) {
      if (cancelled) return;

      // tijdens redirect blijven we NIET in "blocked"
      setAllowed(false);
      setDebug(`redirect -> ${to} (${reason})`);

      // voorkom loops: alleen redirecten als je er nog niet bent
      if (pathname !== to) {
        router.replace(to);
      }
    }

    async function run() {
      setAllowed(false);
      setDebug(`checking pathname=${pathname}`);

      // Public routes altijd toegestaan
      if (PUBLIC_PATHS.includes(pathname)) {
        setAllowed(true);
        setDebug("public path allowed");
        return;
      }

      try {
        const res = await fetch("/api/session", {
          cache: "no-store",
          credentials: "include",
          signal: controller.signal,
        });

        const data = (await res.json().catch(() => null)) as SessionResponse | null;

        if (!res.ok || !data?.loggedIn || !data?.rol) {
          redirect("/login", `not logged in (status=${res.status})`);
          return;
        }

        const isLid = data.rol === "lid";
        const must = data.mustChangePassword === true;

        // Lid moet eerst wachtwoord wijzigen -> force /wachtwoord
        if (isLid && must && pathname !== "/wachtwoord") {
          redirect("/wachtwoord", `mustChangePassword true for ${data.username ?? "-"}`);
          return;
        }

        // Lid hoeft niet meer te wijzigen maar zit nog op /wachtwoord -> naar /mijn
        if (isLid && !must && pathname === "/wachtwoord") {
          redirect("/mijn", `mustChangePassword false for ${data.username ?? "-"}`);
          return;
        }

        // Alles ok
        if (!cancelled) {
          setAllowed(true);
          setDebug(`allowed (rol=${data.rol}, must=${String(must)}, user=${data.username ?? "-"})`);
        }
      } catch (e: any) {
        redirect("/login", `session fetch error: ${String(e?.message || e)}`);
      }
    }

    run();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [pathname, router]);

  // ✅ Belangrijk: NOOIT meer "blocked" tonen.
  // Als het niet allowed is, toon je altijd de loader + debug (ook tijdens redirect)
  if (!allowed) {
    return (
      <main className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6 text-center">
        <p className="text-gray-300 mb-3">Bezig met controleren…</p>
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
