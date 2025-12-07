"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Rol = "eigenaar" | "docent" | "gast";

type AuthGuardProps = {
  children: React.ReactNode;
  allowedRoles: Rol[];
};

export default function AuthGuard({ children, allowedRoles }: AuthGuardProps) {
  const [magTonen, setMagTonen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (typeof window === "undefined") return;

    const ingelogd = window.localStorage.getItem("ingelogd");
    const rol = window.localStorage.getItem("rol") as Rol | null;

    // Niet ingelogd of rol niet toegestaan → terug naar /login
    if (ingelogd !== "ja" || !rol || !allowedRoles.includes(rol)) {
      router.push("/login");
    } else {
      setMagTonen(true);
    }
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