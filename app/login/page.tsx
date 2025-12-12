"use client";

import { FormEvent, Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type Rol = "eigenaar" | "docent" | "gast" | "lid";

function LoginInner() {
  const [username, setUsername] = useState("");
  const [wachtwoord, setWachtwoord] = useState("");
  const [fout, setFout] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const router = useRouter();
  const searchParams = useSearchParams();

  // Alleen interne redirects toestaan
  const nextRaw = searchParams.get("next") || "/";
  const next = nextRaw.startsWith("/") ? nextRaw : "/";

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFout(null);
    setLoading(true);

    const u = username.trim();

    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ username: u, wachtwoord }),
      });

      const data = (await res.json().catch(() => null)) as
        | { success?: boolean; error?: string; rol?: Rol }
        | null;

      if (!res.ok || !data?.success) {
        setFout(data?.error || "Onjuiste inloggegevens");
        return;
      }

      router.replace(next);
      router.refresh();
    } catch (err) {
      console.error(err);
      setFout("Er ging iets mis bij het inloggen");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-black text-white flex items-center justify-center p-6">
      <div className="w-full max-w-sm bg-zinc-900 rounded-xl p-6 border border-zinc-700">
        <h1 className="text-xl font-bold text-pink-500 mb-4">Inloggen</h1>
        <p className="text-sm text-gray-300 mb-4">
          Log in met je gebruikersnaam en wachtwoord.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm mb-1">Gebruikersnaam</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full rounded bg-black border border-zinc-600 p-2 text-white"
              autoComplete="username"
              spellCheck={false}
            />
          </div>

          <div>
            <label className="block text-sm mb-1">Wachtwoord</label>
            <input
              type="password"
              value={wachtwoord}
              onChange={(e) => setWachtwoord(e.target.value)}
              className="w-full rounded bg-black border border-zinc-600 p-2 text-white"
              autoComplete="current-password"
            />
          </div>

          {fout && <p className="text-red-400 text-sm">{fout}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-pink-500 hover:bg-pink-600 disabled:opacity-60 disabled:cursor-not-allowed transition-colors rounded py-2 font-semibold"
          >
            {loading ? "Bezig..." : "Inloggen"}
          </button>
        </form>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-black text-white flex items-center justify-center">
          <p className="text-gray-300">Bezig met laden…</p>
        </main>
      }
    >
      <LoginInner />
    </Suspense>
  );
}
