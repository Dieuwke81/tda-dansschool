"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Rol = "eigenaar" | "docent" | "gast";

export default function LoginPage() {
  const [wachtwoord, setWachtwoord] = useState("");
  const [rol, setRol] = useState<Rol>("gast");
  const [fout, setFout] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // Alleen voor gemak: onthoud de laatst gekozen rol
  useEffect(() => {
    if (typeof window === "undefined") return;
    const bestaandeRol = window.localStorage.getItem("rol") as Rol | null;
    if (bestaandeRol) setRol(bestaandeRol);
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFout(null);
    setLoading(true);

    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wachtwoord, rol }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.success) {
        setFout("Onjuist wachtwoord");
        return;
      }

      // ✅ Tijdelijk nodig omdat AuthGuard/AuthGate nog localStorage gebruikt
      if (typeof window !== "undefined") {
        window.localStorage.setItem("ingelogd", "ja");
        window.localStorage.setItem("rol", rol);
      }

      router.push("/");
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
          Vul het wachtwoord in en kies je rol.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
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

          <div>
            <label className="block text-sm mb-1">Rol</label>
            <select
              value={rol}
              onChange={(e) => setRol(e.target.value as Rol)}
              className="w-full rounded bg-black border border-zinc-600 p-2 text-white"
            >
              <option value="eigenaar">Eigenaar</option>
              <option value="docent">Docent</option>
              <option value="gast">Gast</option>
            </select>
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
