"use client";

import { useEffect, useState } from "react";
import AuthGuard from "@/app/auth-guard";

type MijnData = {
  id: string;
  naam: string;
  email: string;
  les: string;
  tweedeLes: string;
  soort: string;
  toestemmingBeeldmateriaal: string;
  telefoon1: string;
  telefoon2: string;
  geboortedatum: string;
  adres: string;
  postcode: string;
  plaats: string;
  datumGoedkeuring: string;
  username: string;
};

export default function MijnPagina() {
  const [loading, setLoading] = useState(true);
  const [fout, setFout] = useState<string | null>(null);
  const [mijn, setMijn] = useState<MijnData | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setFout(null);

      try {
        const res = await fetch("/api/mijn", { cache: "no-store" });
        const json = await res.json().catch(() => null);

        if (!res.ok || !json?.success) {
          if (!cancelled) setFout(json?.error || "Kon gegevens niet laden");
          return;
        }

        if (!cancelled) setMijn(json.data as MijnData);
      } catch {
        if (!cancelled) setFout("Kon gegevens niet laden");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <AuthGuard allowedRoles={["lid"]}>
      <main className="min-h-screen bg-black text-white p-6 flex justify-center">
        <div className="w-full max-w-xl bg-zinc-900 rounded-xl border border-zinc-700 p-6">
          <h1 className="text-2xl font-bold text-pink-500 mb-4">Mijn gegevens</h1>

          {loading && <p className="text-gray-400">Gegevens laden…</p>}

          {!loading && fout && (
            <p className="text-red-400 text-sm">{fout}</p>
          )}

          {!loading && !fout && mijn && (
            <div className="space-y-3 text-sm">
              <div><span className="text-gray-400">Naam:</span> {mijn.naam}</div>
              <div><span className="text-gray-400">E-mail:</span> {mijn.email}</div>
              <div><span className="text-gray-400">Les:</span> {mijn.les}</div>
              <div><span className="text-gray-400">2e les:</span> {mijn.tweedeLes}</div>
              <div><span className="text-gray-400">Telefoon:</span> {mijn.telefoon1}</div>
              <div><span className="text-gray-400">Adres:</span> {mijn.adres}, {mijn.postcode} {mijn.plaats}</div>
            </div>
          )}
        </div>
      </main>
    </AuthGuard>
  );
}
