
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import AuthGuard from "../auth-guard";

export default function WachtwoordPage() {
  return (
    <AuthGuard allowedRoles={["lid"]}>
      <Inner />
    </AuthGuard>
  );
}

function Inner() {
  const router = useRouter();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const r = await fetch("/api/wachtwoord", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ currentPassword, newPassword, confirmPassword }),
      });

      const d = await r.json().catch(() => null);

      if (!r.ok) {
        setError(d?.error || "Kon wachtwoord niet wijzigen");
        setLoading(false);
        return;
      }

      setLoading(false);
      router.replace("/mijn");
    } catch {
      setError("Kon wachtwoord niet wijzigen");
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-black text-white flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-zinc-900 rounded-xl p-6 border border-zinc-700">
        <h1 className="text-2xl font-bold text-pink-500 mb-2">Wachtwoord wijzigen</h1>
        <p className="text-sm text-gray-300 mb-6">
          Dit is je eerste keer inloggen. Kies nu een nieuw wachtwoord.
        </p>

        {error && <div className="mb-4 text-sm text-red-400">{error}</div>}

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-300 mb-1">Huidig wachtwoord</label>
            <input
              className="w-full rounded-lg bg-black/40 border border-zinc-700 p-3 text-white"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              autoComplete="current-password"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-300 mb-1">Nieuw wachtwoord</label>
            <input
              className="w-full rounded-lg bg-black/40 border border-zinc-700 p-3 text-white"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              autoComplete="new-password"
            />
            <p className="text-xs text-gray-400 mt-1">Minimaal 8 tekens.</p>
          </div>

          <div>
            <label className="block text-sm text-gray-300 mb-1">Herhaal nieuw wachtwoord</label>
            <input
              className="w-full rounded-lg bg-black/40 border border-zinc-700 p-3 text-white"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-pink-600 hover:bg-pink-500 disabled:opacity-60 rounded-lg p-3 font-semibold"
          >
            {loading ? "Bezig…" : "Wijzigen"}
          </button>
        </form>
      </div>
    </main>
  );
}
