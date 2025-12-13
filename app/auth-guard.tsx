
"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter, usePathname } from "next/navigation";

type Rol = "eigenaar" | "docent" | "gast" | "lid";

type AuthGuardProps = {
  children: ReactNode;
  allowedRoles: Rol[];
};

type SessionResponse = {
  loggedIn?: boolean;
  rol?: Rol;
  mustChangePassword?: boolean;
};

export default function AuthGuard({ children, allowedRoles }: AuthGuardProps) {
  const [magTonen, setMagTonen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    async function check() {
      setMagTonen(false);

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

        const rol = data?.rol;
        const loggedIn = data?.loggedIn === true;

        if (!loggedIn || !rol || !allowedRoles.includes(rol)) {
          if (!cancelled) router.replace("/login");
          return;
        }

        // ✅ Force password change voor leden (behalve op /wachtwoord zelf)
        if (rol === "lid" && data?.mustChangePassword === true && pathname !== "/wachtwoord") {
          if (!cancelled) router.replace("/wachtwoord");
          return;
        }

        if (!cancelled) setMagTonen(true);
      } catch {
        if (!cancelled) router.replace("/login");
      }
    }

    check();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [router, allowedRoles, pathname]);

  if (!magTonen) {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center">
        <p className="text-gray-300">Even inloggen…</p>
      </main>
    );
  }

  return <>{children}</>;
}
