"use client";

import { useEffect, useState } from "react";
import AuthGuard from "../auth-guard";

type Item = Record<string, any>;

export default function WijzigingenPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);

    try {
      const r = await fetch("/api/wijzigingen?status=NIEUW", {
        cache: "no-store",
        credentials: "include",
      });
      const j = await r.json().catch(() => null);

      if (!r.ok || !j?.ok) throw new Error(j?.error || "Kon verzoeken niet laden");
      setItems(Array.isArray(j.items) ? j.items : []);
    } catch (e: any) {
      setError(String(e?.message || e));
    } finally {
      setLoading(false);
    }
  }

  async function setStatus(id: string, status: "GOEDGEKEURD" | "AFGEKEURD") {
    try {
      const r = await fetch("/api/wijzigingen", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ id, status }),
      });

      const j = await r.json().catch(() => null);
      if (!r.ok || !j?.ok) throw new Error(j?.error || "Kon status niet opslaan");

      // uit lijst halen
      setItems((prev) => prev.filter((x) => String(x.id) !== String(id)));
    } catch (e: any) {
      alert(String(e?.message || e));
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <AuthGuard allowedRoles={["eigenaar"]}>
      <main className="min-h-screen bg-black text-white p-4 md:p-6">
        <div className="flex items-center justify-between gap-3 mb-4">
          <h1 className="text-2xl font-bold text-pink-500">Wijzigingsverzoeken</h1>
          <button
            onClick={load}
            className="rounded-full border border-zinc-700 px-4 py-2 text-sm text-gray-200 hover:bg-white/5"
          >
            Vernieuwen
          </button>
        </div>

        {loading && <p className="text-gray-400">Laden…</p>}
        {error && <p className="text-red-400">{error}</p>}

        {!loading && !error && items.length === 0 && (
          <p className="text-gray-400">Geen nieuwe verzoeken.</p>
        )}

        <div className="space-y-3">
          {items.map((it) => (
            <div key={String(it.id)} className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-semibold text-white">{it.veld}</div>
                  <div className="text-sm text-gray-400 mt-1">
                    Lid: <span className="text-gray-200">{it.lid_id}</span> • Aangevraagd door:{" "}
                    <span className="text-gray-200">{it.aangevraagd_door_username}</span>
                  </div>
                </div>
                <div className="text-xs text-gray-500 whitespace-nowrap">{String(it.created_at || "")}</div>
              </div>

              <div className="mt-3 grid grid-cols-1 gap-2 text-sm">
                <div className="text-gray-300">
                  <span className="text-gray-500">Oud:</span> {String(it.oud || "-")}
                </div>
                <div className="text-gray-300">
                  <span className="text-gray-500">Nieuw:</span> {String(it.nieuw || "-")}
                </div>
                {it.notitie ? (
                  <div className="text-gray-300">
                    <span className="text-gray-500">Notitie:</span> {String(it.notitie)}
                  </div>
                ) : null}
              </div>

              <div className="mt-4 flex gap-3">
                <button
                  onClick={() => setStatus(String(it.id), "GOEDGEKEURD")}
                  className="flex-1 rounded-full bg-pink-500 px-4 py-2 font-semibold text-black hover:bg-pink-400"
                >
                  Goedkeuren
                </button>
                <button
                  onClick={() => setStatus(String(it.id), "AFGEKEURD")}
                  className="flex-1 rounded-full border border-zinc-700 px-4 py-2 font-semibold text-white hover:bg-white/5"
                >
                  Afkeuren
                </button>
              </div>
            </div>
          ))}
        </div>
      </main>
    </AuthGuard>
  );
}
