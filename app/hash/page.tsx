"use client";

import { useState } from "react";
import AuthGuard from "../auth-guard";

export default function HashPage() {
  const [password, setPassword] = useState("");
  const [hash, setHash] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function generate() {
    setError(null);
    setHash("");
    setLoading(true);

    try {
      const res = await fetch("/api/hash", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data?.error || "Er ging iets mis");
        return;
      }

      setHash(data?.hash || "");
    } catch (e) {
      setError("Netwerkfout");
    } finally {
      setLoading(false);
    }
  }

  async function copy() {
    await navigator.clipboard.writeText(hash);
  }

  return (
    <AuthGuard allowedRoles={["eigenaar"]}>
      <main className="min-h-screen bg-black text-white p-4 md:p-6">
        <h1 className="text-2xl font-bold text-pink-500 mb-2">Hash maken</h1>
        <p className="text-gray-300 mb-6">
          Alleen voor de eigenaar. Plak de hash daarna in je Google Sheet.
        </p>

        <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-5 space-y-4 max-w-xl">
          <div>
            <label className="block text-sm mb-1 text-gray-300">
              Nieuw wachtwoord (min. 8 tekens)
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded bg-black border border-zinc-600 p-2 text-white"
            />
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <button
            onClick={generate}
            disabled={loading || password.length < 8}
            className="w-full bg-pink-500 hover:bg-pink-600 disabled:opacity-60 disabled:cursor-not-allowed transition-colors rounded-full py-3 font-semibold"
          >
            {loading ? "Bezig..." : "Genereer hash"}
          </button>

          {hash && (
            <div className="space-y-2">
              <div className="text-xs uppercase tracking-wide text-gray-400">
                Hash
              </div>
              <div className="bg-black border border-zinc-700 rounded-xl p-3 break-all text-sm">
                {hash}
              </div>
              <button
                onClick={copy}
                className="w-full bg-zinc-800 hover:bg-zinc-700 transition-colors rounded-full py-2 font-semibold"
              >
                Kopieer hash
              </button>
            </div>
          )}
        </div>
      </main>
    </AuthGuard>
  );
}
