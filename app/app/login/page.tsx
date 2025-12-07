"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Rol = "eigenaar" | "docent" | "gast";

// 🔐 Basis-wachtwoord (we vergelijken straks altijd in lowercase)
const juistWachtwoord = "tda123";

export default function LoginPage() {
  const [wachtwoord, setWachtwoord] = useState("");
  const [rol, setRol] = useState<Rol>("eigenaar");
  const [fout, setFout] = useState<string | null>(null);
  const router = useRouter();

  // Als je al ingelogd bent, ga meteen naar de homepagina
  useEffect(() => {
    if (typeof window === "undefined") return;
    const ingelogd = window.localStorage.getItem("ingelogd");
    if (ingelogd === "ja") {
      router.push("/");
    }
  }, [router]);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFout(null);

    // haal spaties weg en maak alles lowercase
    const normalized = wachtwoord.trim().toLowerCase();

    if (normalized === juistWachtwoord) {
      // ✅ Ingelogd: sla op in localStorage
      if (typeof window !== "undefined") {
        window.localStorage.setItem("ingelogd", "ja");
        window.localStorage.setItem("rol", rol);
      }

      router.push("/"); // naar home
    } else {
      setFout("Onjuist wachtwoord. Probeer het opnieuw.");
    }
  }

  return (
    <main className="min-h-screen bg-black text-white flex items-center justify-center px-6">
      <div className="w-full max-w-sm border border-zinc-800 rounded-2xl p-6 bg-zinc-950/80 shadow-lg">
        <h1 className="text-2xl font-bold text-pink-500 mb-2 text-center">
          Inloggen
        </h1>
        <p className="text-sm text-gray-300 mb-6 text-center">
          Vul het wachtwoord in om de beheeromgeving te openen.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Wachtwoordveld */}
          <div>
            <label className="block text-sm mb-1" htmlFor="wachtwoord">
              Wachtwoord
            </label>
            <input
              id="wachtwoord"
              type="password"
              value={wachtwoord}
              onChange={(e) => setWachtwoord(e.target.value)}
              className="w-full rounded bg-zinc-900 border border-zinc-700 p-2 text-white"
              placeholder="Voer wachtwoord in"
              autoComplete="off"
            />
          </div>

          {/* Rol-keuze */}
          <div>
            <label className="block text-sm mb-1" htmlFor="rol">
              Rol
            </label>
            <select
              id="rol"
              value={rol}
              onChange={(e) => setRol(e.target.value as Rol)}
              className="w-full rounded bg-zinc-900 border border-zinc-700 p-2 text-white"
            >
              <option value="eigenaar">Eigenaar</option>
              <option value="docent">Docent</option>
              <option value="gast">Gast</option>
            </select>
            <p className="text-xs text-gray-400 mt-1">
              Deze rol gebruiken we later om te bepalen wat iemand mag zien.
            </p>
          </div>

          {/* Foutmelding */}
          {fout && <p className="text-sm text-red-400">{fout}</p>}

          <button
            type="submit"
            className="w-full mt-2 bg-pink-500 hover:bg-pink-400 text-black font-semibold py-2 rounded-full transition-colors"
          >
            Inloggen
          </button>
        </form>

        <p className="text-[11px] text-gray-500 mt-4 text-center">
          Tijdelijk wachtwoord: <span className="font-mono">tda123</span>
        </p>
      </div>
    </main>
  );
}