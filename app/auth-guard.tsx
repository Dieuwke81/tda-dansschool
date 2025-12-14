
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
  const router = useRouter();
  const [ok, setOk] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      setOk(false);
      setChecking(true);

      try {
        const res = await fetch("/api/session", {
          cache: "no-store",
          credentials: "same-origin",
        });

        if (!res.ok) {
          router.replace("/login");
          return;
        }

        const data = (await res.json()) as SessionResponse;

        if (!data?.loggedIn || !data?.rol || !allowedRoles.includes(data.rol)) {
          router.replace("/login");
          return;
        }

        if (!cancelled) setOk(true);
      } catch {
        router.replace("/login");
      } finally {
        if (!cancelled) setChecking(false);
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [router, allowedRoles]);

  if (checking) {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center">
        <p className="text-gray-300">Even controleren…</p>
      </main>
    );
  }

  if (!ok) return null;

  return <>{children}</>;
}
