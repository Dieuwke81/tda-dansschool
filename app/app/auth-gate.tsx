"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

const PUBLIC_PATHS = ["/login"];

export function AuthGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [allowed, setAllowed] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    // /login is altijd openbaar
    if (PUBLIC_PATHS.includes(pathname)) {
      setAllowed(true);
      setChecking(false);
      return;
    }

    // Alleen in de browser hebben we localStorage
    if (typeof window === "undefined") {
      return;
    }

    const ingelogd = localStorage.getItem("tda_ingelogd");

    if (ingelogd === "ja") {
      setAllowed(true);
    } else {
      // niet ingelogd → doorsturen naar /login
      router.replace("/login");
    }

    setChecking(false);
  }, [pathname, router]);

  if (checking) {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center">
        <p className="text-gray-300">Bezig met controleren…</p>
      </main>
    );
  }

  if (!allowed) {
    return null;
  }

  return <>{children}</>;
}