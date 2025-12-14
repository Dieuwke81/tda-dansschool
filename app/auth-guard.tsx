
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
  username?: string;
};

export default function AuthGuard({ children, allowedRoles }: AuthGuardProps) {
  const [magTonen, setMagTonen] = useState(false);
  const [debug, setDebug] = useState<string>("start");
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    async function check() {
      setMagTonen(false);
      setDebug(`checking: pathname=${pathname}`);

      try {
        // timeout zodat hij niet "eeuwig" blijft hangen
        const t = setTimeout(() => controller.abort(), 8000);

        const res = await fetch("/api/session", {
          cache: "no-store",
          credentials: "same-origin",
          signal: controller.signal,
        });

        clearTimeout(t);

        const text = await res.text();

        if (!res.ok) {
          setDebug(`session NOT ok: status=${res.status} body=${text.slice(0, 200)}`);
          router.replace("/login");
          return;
        }

        let data: SessionResponse | null = null;
        try {
          data = JSON.parse(text) as SessionResponse;
        } catch {
          setDebug(`session JSON parse failed: ${text.slice(0, 200)}`);
          router.replace("/login");
          return;
        }

        if (!data?.loggedIn || !data.rol || !allowedRoles.includes(data.rol)) {
          setDebug(
            `not allowed: loggedIn=${String(data?.loggedIn)} rol=${String(
              data?.rol
            )} allowed=${allowedRoles.join(",")}`
          );
          router.replace("/login");
          return;
        }

        // ✅ trailing slash / subpaths veilig maken
        const onWachtwoord = pathname === "/wachtwoord" || pathname.startsWith("/wachtwoord/");

        // ✅ Forceer wachtwoord wijzigen voor leden, behalve op /wachtwoord zelf
        if (data.rol === "lid" && data.mustChangePassword === true && !onWachtwoord) {
          setDebug(`redirect -> /wachtwoord (user=${data.username ?? "-"})`);
          router.replace("/wachtwoord");
          return;
        }

        if (!cancelled) {
          setDebug("OK -> show children");
          setMagTonen(true);
        }
      } catch (e: any) {
        setDebug(`session fetch error: ${String(e?.name || "")} ${String(e?.message || e)}`);
        router.replace("/login");
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
      <main className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6 text-center">
        <p className="text-gray-300 mb-3">Even controleren…</p>

        {/* Debug zichtbaar, zodat we direct zien wat er gebeurt */}
        <pre className="w-full max-w-xl text-left text-xs text-gray-300 bg-black/40 border border-zinc-800 rounded-lg p-3 overflow-auto">
          {debug}
        </pre>
      </main>
    );
  }

  return <>{children}</>;
}
