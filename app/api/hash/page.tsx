"use client";

import { useState } from "react";
import AuthGuard from "../auth-guard";

export default function HashPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [hash, setHash] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function makeHash() {
    setError(null);
    setHash("");

    if (!username.trim()) {
      setError("Vul een username in");
      return;
    }
    if (password.length < 8) {
      setError("Wachtwoord moet minimaal 8 tekens zijn");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/hash", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data?.error ?? "Er ging iets mis");
        return;
      }

      setHash(data.hash);
    } catch (e) {
      setError("Er ging iets mis");
    } finally {
      setLoading(false);
    }
  }

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
    } catch {}
  }

  return (
    <AuthGuard allowedRoles={["eigenaar"]}>
      <main className="min-h-screen bg-black text-white p-4 md:p-6">
        <h1 className="text-2xl font-bold text-pink-500 mb-2">
          Lid-account aanmaken (hash)
        </h1>
        <p className="text-gray-300 mb-4">
          Vul een username en tijdelijk wachtwoord in. Plak daarna de username in kolom O en
          de hash in kolom P van je sheet.
        </p>

        <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-4 space-y-3">
          <div>
            <label className="block text-sm mb-1">Username (kolom O)</label>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full rounded bg-black border border-zinc-600 p-2 text-white"
              placeholder="bijv. emma.v"
            />
          </div>

          <div>
            <label className="block text-sm mb-1">Tijdelijk wachtwoord</label>
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded bg-black border border-zinc-600 p-2 text-white"
              placeholder="bijv. TDA-9321"
              type="password"
            />
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <button
            onClick={makeHash}
            disabled={loading}
            className="w-full bg-pink-500 hover:bg-pink-600 disabled:opacity-60 disabled:cursor-not-allowed transition-colors rounded py-2 font-semibold"
          >
            {loading ? "Bezig..." : "Maak hash"}
          </button>

          {hash && (
            <div className="pt-2 space-y-2">
              <div className="text-sm text-gray-300">
                Plak dit in je sheet:
              </div>

              <div className="bg-black border border-zinc-700 rounded p-2 text-xs break-all">
                <div className="text-gray-400 mb-1">username (O):</div>
                <div className="flex items-center gap-2">
                  <code className="flex-1">{username}</code>
                  <button
                    onClick={() => copy(username)}
                    className="text-pink-400 underline text-xs"
                  >
                    kopieer
                  </button>
                </div>

                <div className="text-gray-400 mt-3 mb-1">password_hash (P):</div>
                <div className="flex items-center gap-2">
                  <code className="flex-1">{hash}</code>
                  <button
                    onClick={() => copy(hash)}
                    className="text-pink-400 underline text-xs"
                  >
                    kopieer
                  </button>
                </div>
              </div>

              <p className="text-xs text-gray-400">
                Let op: het echte wachtwoord sla je nergens op. Jij moet het wachtwoord dus zelf
                aan het lid doorgeven.
              </p>
            </div>
          )}
        </div>
      </main>
    </AuthGuard>
  );
}
