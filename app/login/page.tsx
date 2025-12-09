"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Rol = "eigenaar" | "docent" | "gast";

// Tijdelijk gedeeld wachtwoord
const juistWachtwoord = "tda123";

export default function LoginPage() {
  const [wachtwoord, setWachtwoord] = useState("");
  const [rol, setRol] = useState<Rol>("gast");
  const [fout, setFout] = useState<string | null>(null);
  const router = useRouter();

  // Als er al een rol in localStorage staat, kies die standaard in de dropdown
  useEffect(() => {
    if (typeof window === "undefined") return;
    const bestaandeRol = window.localStorage.getItem("rol") as Rol | null;
    if (bestaandeRol) {
      setRol(bestaandeRol);
    }
  }, []);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFout(null);

    if (wachtwoord === juistWachtwoord) {
      if (typeof window !== "undefined") {
        window.localStorage.setItem("ingelogd", "ja");
        window.localStorage.setItem("rol", rol);
      }
      // Na succesvol inloggen ga je naar de startpagina
      router.push("/");
    } else {
      setFout("Onjuist wachtwoord");
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
            className="w-full bg-pink-500 hover:bg-pink-600 transition-colors rounded py-2 font-semibold"
          >
            Inloggen
          </button>
        </form>
      </div>
    </main>
  );
}
