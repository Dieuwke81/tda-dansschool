
"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";

const PUBLIC_PATHS = ["/login"];

type SessionResponse = {
  loggedIn?: boolean;
  rol?: "eigenaar" | "docent" | "gast" | "lid";
  mustChangePassword?: boolean;
};

export function AuthGate({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  const [allowed, setAllowed] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    async function checkSession() {
      setAllowed(false);
      setChecking(true);

      // Publieke pagina’s altijd toestaan
      if (PUBLIC_PATHS.includes(pathname)) {
        if (!cancelled) {
          setAllowed(true);
          setChecking(false);
        }
        return;
      }

      try {
        const res = await fetch("/api/session", {
          cache: "no-store",
          credentials: "same-origin",
          signal: controller.signal,
        });

        const data = (await res.json().catch(() => null)) as SessionResponse | null;

        if (!res.ok || !data?.loggedIn) {
          if (!cancelled) router.replace("/login");
          return;
        }

        // ✅ Force password change flow (globaal, 1 plek!)
        if (data.rol === "lid" && data.mustChangePassword === true) {
          if (pathname !== "/wachtwoord") {
            if (!cancelled) router.replace("/wachtwoord");
            return;
          }
        }

        // ✅ Als je op /wachtwoord staat maar je hoeft niet te wijzigen -> door naar /mijn
        if (pathname === "/wachtwoord" && data.mustChangePassword !== true) {
          if (!cancelled) router.replace("/mijn");
          return;
        }

        if (!cancelled) setAllowed(true);
      } catch {
        if (!cancelled) router.replace("/login");
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

  if (checking) {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center">
        <p className="text-gray-300">Bezig met controleren…</p>
      </main>
    );
  }

  if (!allowed) return null;

  return <>{children}</>;
}
