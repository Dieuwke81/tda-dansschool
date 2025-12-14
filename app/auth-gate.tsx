
"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";

const PUBLIC_PATHS = ["/login"]; // eventueel later uitbreiden

type SessionResponse = {
  loggedIn?: boolean;
  rol?: "eigenaar" | "docent" | "gast" | "lid";
  username?: string;
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

      // Publieke routes altijd toestaan
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

        if (!res.ok) {
          if (!cancelled) router.replace("/login");
          return;
        }

        const data = (await res.json()) as SessionResponse;

        if (!data?.loggedIn) {
          if (!cancelled) router.replace("/login");
          return;
        }

        const isLid = data.rol === "lid";
        const must = data.mustChangePassword === true;

        // 1) Lid moet wachtwoord wijzigen -> force naar /wachtwoord
        if (isLid && must && pathname !== "/wachtwoord") {
          if (!cancelled) router.replace("/wachtwoord");
          return;
        }

        // 2) Lid hoeft niet te wijzigen maar zit nog op /wachtwoord -> terug naar /mijn
        if (isLid && !must && pathname === "/wachtwoord") {
          if (!cancelled) router.replace("/mijn");
          return;
        }

        // Anders is alles ok
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
