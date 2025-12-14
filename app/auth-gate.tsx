
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
      setDebug(`redirect -> ${to} (${reason})`);
      router.replace(to);
    }

    async function run() {
      setAllowed(false);
      setChecking(true);
      setDebug(`checking pathname=${pathname}`);

      if (PUBLIC_PATHS.includes(pathname)) {
        setAllowed(true);
        setChecking(false);
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
          go("/login", `not logged in (status=${res.status})`);
          return;
        }

        const isLid = data.rol === "lid";
        const must = data.mustChangePassword === true;

        // ✅ enige “force” regel:
        // lid moet wijzigen -> altijd naar /wachtwoord
        if (isLid && must && pathname !== "/wachtwoord") {
          go("/wachtwoord", `mustChangePassword true for ${data.username ?? "-"}`);
          return;
        }

        // ✅ verder: gewoon toestaan (ook /wachtwoord)
        setAllowed(true);
        setDebug(`allowed (rol=${data.rol}, must=${String(must)}, user=${data.username ?? "-"})`);
      } finally {
        setChecking(false);
      }
    }

    run();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [pathname, router]);

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
        <p className="text-gray-300 mb-3">Toegang geblokkeerd.</p>
        <pre className="w-full max-w-xl text-left text-xs text-gray-300 bg-black/40 border border-zinc-800 rounded-lg p-3 overflow-auto">
          {debug}
        </pre>
      </main>
    );
  }

  return <>{children}</>;
}
