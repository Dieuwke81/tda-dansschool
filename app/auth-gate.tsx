
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
  const [checking, setChecking] = useState(true);
  const [debug, setDebug] = useState("start");

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    function go(to: string, reason: string) {
      if (cancelled) return;
      setAllowed(false);
      setChecking(true);
      setDebug(`redirect -> ${to} (${reason})`);
      router.replace(to);
    }

    async function checkSession() {
      if (cancelled) return;

      setAllowed(false);
      setChecking(true);
      setDebug(`checking pathname=${pathname}`);

      // Publiek
      if (PUBLIC_PATHS.includes(pathname)) {
        setAllowed(true);
        setChecking(false);
        setDebug("public path allowed");
        return;
      }

      // timeout: nooit eindeloos “controleren”
      const timeout = setTimeout(() => controller.abort(), 8000);

      try {
        const res = await fetch("/api/session", {
          cache: "no-store",
          credentials: "include",
          signal: controller.signal,
        });

        const text = await res.text();
        clearTimeout(timeout);

        if (!res.ok) {
          go("/login", `session status=${res.status} body=${text.slice(0, 120)}`);
          return;
        }

        let data: SessionResponse | null = null;
        try {
          data = JSON.parse(text) as SessionResponse;
        } catch {
          go("/login", `session not json: ${text.slice(0, 120)}`);
          return;
        }

        if (!data?.loggedIn || !data?.rol) {
          go("/login", `not logged in (loggedIn=${String(data?.loggedIn)})`);
          return;
        }

        const isLid = data.rol === "lid";
        const must = data.mustChangePassword === true;

        // ============================
        // ✅ FIX: voorkom redirect-loop
        // ============================
        // Als lid MOET wijzigen:
        // - zit je NIET op /wachtwoord -> redirect naar /wachtwoord
        // - zit je WEL op /wachtwoord -> laat de pagina juist renderen
        if (isLid && must) {
          if (pathname !== "/wachtwoord") {
            go("/wachtwoord", `mustChangePassword true for ${data.username ?? "-"}`);
            return;
          }

          // ✅ hier dus NIET redirecten, gewoon toestaan
          setAllowed(true);
          setDebug(`allowed on /wachtwoord (mustChangePassword=true for ${data.username ?? "-"})`);
          return;
        }

        // lid hoeft niet te wijzigen maar zit op /wachtwoord -> naar /mijn
        if (isLid && !must && pathname === "/wachtwoord") {
          go("/mijn", "mustChangePassword false, leaving /wachtwoord");
          return;
        }

        setAllowed(true);
        setDebug(`allowed (rol=${data.rol}, user=${data.username ?? "-"})`);
      } catch (e: any) {
        clearTimeout(timeout);

        if (e?.name === "AbortError") {
          go("/login", "session fetch timeout/abort");
          return;
        }

        go("/login", `session fetch error: ${String(e?.message || e)}`);
      } finally {
        if (!cancelled) setChecking(false);
      }
    }

    checkSession();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [pathname, router]);

  // ✅ Nooit meer zwart scherm
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
    return (
      <main className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6 text-center">
        <p className="text-gray-300 mb-3">Toegang geblokkeerd (nog niet toegestaan).</p>
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
