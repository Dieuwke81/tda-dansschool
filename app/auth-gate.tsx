
"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";

const PUBLIC_PATHS = ["/login"]; // voeg evt "/hash" etc toe als dat publiek moet zijn

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

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    function stopAndRedirect(to: string) {
      // voorkom "eeuwig" blijven hangen
      if (!cancelled) {
        setAllowed(false);
        setChecking(false);
        router.replace(to);
      }
    }

    async function checkSession() {
      // reset bij elke route change
      if (!cancelled) {
        setAllowed(false);
        setChecking(true);
      }

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
          credentials: "include",
          signal: controller.signal,
        });

        if (!res.ok) {
          stopAndRedirect("/login");
          return;
        }

        const data = (await res.json().catch(() => null)) as SessionResponse | null;

        if (!data?.loggedIn || !data?.rol) {
          stopAndRedirect("/login");
          return;
        }

        const isLid = data.rol === "lid";
        const must = data.mustChangePassword === true;

        // 1) Lid moet wachtwoord wijzigen -> force naar /wachtwoord
        if (isLid && must && pathname !== "/wachtwoord") {
          stopAndRedirect("/wachtwoord");
          return;
        }

        // 2) Lid hoeft niet te wijzigen maar zit nog op /wachtwoord -> terug naar /mijn
        if (isLid && !must && pathname === "/wachtwoord") {
          stopAndRedirect("/mijn");
          return;
        }

        // Alles ok -> pagina tonen
        if (!cancelled) setAllowed(true);
      } catch {
        // bij fetch errors (of abort) niet blijven hangen
        if (!cancelled) {
          // Als dit een abort is door route change: niet naar login knallen
          // (maar gewoon stoppen met checken en wachten op nieuwe effect-run)
          setAllowed(false);
        }
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
