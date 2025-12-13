
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
  mustChangePassword?: boolean;
};

export default function AuthGuard({ children, allowedRoles }: AuthGuardProps) {
  const [magTonen, setMagTonen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;

    async function check() {
      setMagTonen(false);

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

        if (!data.loggedIn || !data.rol || !allowedRoles.includes(data.rol)) {
          router.replace("/login");
          return;
        }

        // 🔥 DIT IS DE MISSENDE SCHAKEL
        if (data.rol === "lid" && data.mustChangePassword === true) {
          router.replace("/wachtwoord");
          return;
        }

        if (!cancelled) setMagTonen(true);
      } catch {
        router.replace("/login");
      }
    }

    check();
    return () => {
      cancelled = true;
    };
  }, [router, allowedRoles]);

  if (!magTonen) {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center">
        <p className="text-gray-300">Even controleren…</p>
      </main>
    );
  }

  return <>{children}</>;
}
