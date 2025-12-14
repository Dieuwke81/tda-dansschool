
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

        // ✅ Forceer wachtwoord wijzigen voor leden, maar NIET als je al op /wachtwoord zit
        if (
          data.rol === "lid" &&
          data.mustChangePassword === true &&
          pathname !== "/wachtwoord"
        ) {
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
  }, [router, allowedRoles, pathname]);

  if (!magTonen) {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center">
        <p className="text-gray-300">Even controleren…</p>
      </main>
    );
  }

  return <>{children}</>;
}
