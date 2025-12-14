
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type SessionResponse = {
  loggedIn?: boolean;
  rol?: "eigenaar" | "docent" | "gast" | "lid";
  username?: string;
  mustChangePassword?: boolean;
};

export default function WachtwoordPage() {
  const router = useRouter();

  const [checking, setChecking] = useState(true);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ✅ Zorgt dat je alleen hier komt als je:
  // - ingelogd bent
  // - rol = lid
  // - mustChangePassword = true
  useEffect(() => {
    let cancelled = false;

    async function check() {
      setChecking(true);
      setError(null);

      try {
        const res = await fetch("/api/session", {
          cache: "no-store",
          credentials: "include",
        });

        const data = (await res.json().catch(() => null)) as SessionResponse | null;

        if (!res.ok || !data?.loggedIn) {
          router.replace("/login");
          return;
        }

        if (data.rol !== "lid") {
          router.replace("/login");
          return;
        }

        // Als hij niet meer hoeft te wijzigen -> terug naar /mijn
        if (data.mustChangePassword !== true) {
          router.replace("/mijn");
          return;
        }

        if (!cancelled) setChecking(false);
      } catch {
        router.replace("/login");
      }
    }

    check();
    return () => {
      cancelled = true;
    };
  }, [router]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const r = await fetch("/api/wachtwoord", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          currentPassword,
          newPassword,
          confirmPassword,
        }),
      });

      const d = await r.json().catch(() => null);

      if (!r.ok) {
        setError(d?.error || "Kon wachtwoord niet wijzigen");
        return;
      }

      router.replace("/mijn");
      router.refresh();
    } catch {
      setError("Kon wachtwoord niet wijzigen");
    } finally {
      setLoading(false);
    }
  }

  if (checking) {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center p-6">
        <p className="text-gray-300">Even controleren…</p>
      </main>
    );
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
              type="password"
              className="w-full rounded-lg bg-black/40 border border-zinc-700 p-3 text-white"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              autoComplete="current-password"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-300 mb-1">Nieuw wachtwoord</label>
            <input
              type="password"
              className="w-full rounded-lg bg-black/40 border border-zinc-700 p-3 text-white"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              autoComplete="new-password"
            />
            <p className="text-xs text-gray-400 mt-1">Minimaal 8 tekens.</p>
          </div>

          <div>
            <label className="block text-sm text-gray-300 mb-1">Herhaal nieuw wachtwoord</label>
            <input
              type="password"
              className="w-full rounded-lg bg-black/40 border border-zinc-700 p-3 text-white"
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
