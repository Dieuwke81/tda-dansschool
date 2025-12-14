
"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";

const PUBLIC_PATHS = ["/login"];

type SessionResponse = {
  loggedIn?: boolean;
};

export function AuthGate({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  const [allowed, setAllowed] = useState(false);
  const [debug, setDebug] = useState("start");

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    async function run() {
      setAllowed(false);
      setDebug(`checking pathname=${pathname}`);

      // Publieke routes altijd toestaan
      if (PUBLIC_PATHS.includes(pathname)) {
        setAllowed(true);
        setDebug("public path allowed");
        return;
      }

      try {
        const res = await fetch("/api/session", {
          cache: "no-store",
          credentials: "include",
          signal: controller.signal,
        });

        const data = (await res.json().catch(() => null)) as SessionResponse | null;

        if (!res.ok || !data?.loggedIn) {
          setDebug(`not logged in -> /login (status=${res.status})`);
          router.replace("/login");
          return;
        }

        // ✅ Vanaf hier: middleware regelt autorisatie & redirects
        if (!cancelled) {
          setAllowed(true);
          setDebug("allowed");
        }
      } catch (e: any) {
        setDebug(`session fetch error -> /login: ${String(e?.message || e)}`);
        router.replace("/login");
      }
    }

    run();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [pathname, router]);

  if (!allowed) {
    return (
      <main className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6 text-center">
        <p className="text-gray-300 mb-3">Bezig met controleren…</p>
        <pre className="w-full max-w-xl text-left text-xs text-gray-300 bg-black/40 border border-zinc-800 rounded-lg p-3 overflow-auto">
          {debug}
        </pre>
      </main>
    );
  }

  return <>{children}</>;
}
