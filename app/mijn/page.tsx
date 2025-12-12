"use client";

import { useEffect, useState } from "react";
import AuthGuard from "@/app/auth-guard";

type SessionData = {
  loggedIn?: boolean;
  rol?: "lid" | "eigenaar" | "docent" | "gast";
};

export default function MijnPagina() {
  const [loading, setLoading] = useState(true);
  const [rol, setRol] = useState<SessionData["rol"]>(null);

  useEffect(() => {
    async function loadSession() {
      try {
        const res = await fetch("/api/session", { cache: "no-store" });
        const data = (await res.json()) as SessionData;
        setRol(data.rol ?? null);
      } catch {
        setRol(null);
      } finally {
        setLoading(false);
      }
    }

    loadSession();
  }, []);

  if (loading) {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center">
        <p className="text-gray-400">Gegevens laden…</p>
      </main>
    );
  }

  return (
    <AuthGuard allowedRoles={["lid"]}>
      <main className="min-h-screen bg-black text-white p-6 flex justify-center">
        <div className="w-full max-w-xl bg-zinc-900 rounded-xl border border-zinc-700 p-6">
          <h1 className="text-2xl font-bold text-pink-500 mb-4">
            Mijn gegevens
          </h1>

          <p className="text-gray-300 mb-6">
            Welkom! Op deze pagina zie je straks je eigen gegevens.
          </p>

          {/* Placeholder – dit vullen we in de volgende stap */}
          <div className="space-y-3 text-sm">
            <div>
              <span className="text-gray-400">Naam:</span>{" "}
              <span className="text-white">—</span>
            </div>
            <div>
              <span className="text-gray-400">Les:</span>{" "}
              <span className="text-white">—</span>
            </div>
            <div>
              <span className="text-gray-400">E-mail:</span>{" "}
              <span className="text-white">—</span>
            </div>
          </div>

          <p className="text-xs text-gray-500 mt-6">
            (Deze gegevens worden in de volgende stap automatisch uit de sheet
            geladen.)
          </p>
        </div>
      </main>
    </AuthGuard>
  );
}
