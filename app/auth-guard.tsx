"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";

type Rol = "eigenaar" | "docent" | "gast" | "lid";

type AuthGuardProps = {
  children: ReactNode;
  allowedRoles: Rol[];
};

type SessionResponse = {
  loggedIn?: boolean;
  rol?: Rol;
};

export default function AuthGuard({ children, allowedRoles }: AuthGuardProps) {
  const [magTonen, setMagTonen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    async function check() {
      // reset bij (re)mount / change roles
      setMagTonen(false);

      try {
        // Server leest httpOnly cookie en geeft rol terug
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
  }, [router, allowedRoles]);

  if (!magTonen) {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center">
        <p className="text-gray-300">Even inloggen…</p>
      </main>
    );
  }

  return <>{children}</>;
}
