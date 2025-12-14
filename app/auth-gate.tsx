
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
  const [debug, setDebug] = useState("start");

  const lastHardRedirectRef = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    function hardRedirect(to: string, reason: string) {
      if (cancelled) return;

      setAllowed(false);
      setDebug(`redirect -> ${to} (${reason})`);

      // voorkom eindeloze hard refresh loop
      if (lastHardRedirectRef.current === to) return;
      lastHardRedirectRef.current = to;

      // HARD redirect werkt altijd (ook mobiel/PWA)
      window.location.replace(to);
    }

    async function run() {
      setAllowed(false);
      setDebug(`checking pathname=${pathname}`);

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
          hardRedirect("/login", `not logged in (status=${res.status})`);
          return;
        }

        const isLid = data.rol === "lid";
        const must = data.mustChangePassword === true;

        // ✅ als lid MOET wijzigen:
        // op /wachtwoord => toestaan
        // anders => hard redirect naar /wachtwoord
        if (isLid && must) {
          if (pathname === "/wachtwoord") {
            setAllowed(true);
            setDebug(`allowed: on /wachtwoord (user=${data.username ?? "-"})`);
            return;
          }
          hardRedirect("/wachtwoord", `mustChangePassword true for ${data.username ?? "-"}`);
          return;
        }

        // lid hoeft niet meer te wijzigen maar staat nog op /wachtwoord
        if (isLid && !must && pathname === "/wachtwoord") {
          hardRedirect("/mijn", `mustChangePassword false for ${data.username ?? "-"}`);
          return;
        }

        setAllowed(true);
        setDebug(`allowed (rol=${data.rol}, user=${data.username ?? "-"})`);
      } catch (e: any) {
        hardRedirect("/login", `session fetch error: ${String(e?.message || e)}`);
      }
    }

    run();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [pathname, router]);

  if (!allowed) {
    return (
      <main className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6 text-center">
        <p className="text-gray-300 mb-3">Bezig met controleren…</p>
        <pre className="w-full max-w-xl text-left text-xs text-gray-300 bg-black/40 border border-zinc-800 rounded-lg p-3 overflow-auto">
          {debug}
        </pre>
        <button className="mt-4 text-gray-400 underline text-sm" onClick={() => window.location.replace("/login")}>
          Naar login
        </button>
      </main>
    );
  }

  return <>{children}</>;
}
