"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

// Tijdelijk 1 gedeeld wachtwoord voor iedereen.
// Pas 'tda123' aan als je een ander wachtwoord wilt.
const juistWachtwoord = "tda123";

type Rol = "eigenaar" | "docent" | "gast";

export default function LoginPage() {
  const [wachtwoord, setWachtwoord] = useState("");
  const [rol, setRol] = useState<Rol>("docent");
  const [fout, setFout] = useState<string | null>(null);
  const router = useRouter();

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFout(null);

    if (wachtwoord === juistWachtwoord) {
      // markeer dat er is ingelogd
      if (typeof window !== "undefined") {
        localStorage.setItem("tda_ingelogd", "ja");
        localStorage.setItem("tda_rol", rol); // 👈 rol opslaan
      }
      // ga naar de startpagina
      router.push("/");
    } else {
      setFout("Onjuist wachtwoord");
    }
  }

  return (
    <main className="min-h-screen bg-black text-white flex items-center justify-center p-6">
      <div className="w-full max-w-sm bg-zinc-900 rounded-xl p-6 shadow-lg border border-zinc-800">
        <h1 className="text-2xl font-bold text-pink-500 mb-1">
          Inloggen
        </h1>
        <p className="text-sm text-gray-400 mb-4">
          Alleen voor beheerders van TDA Dansschool.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm mb-1">Rol</label>
            <select
              value={rol}
              onChange={(e) => setRol(e.target.value as Rol)}
              className="w-full rounded bg-zinc-950 border border-zinc-700 p-2 text-sm text-white"
            >
              <option value="eigenaar">Eigenaar (jijzelf)</option>
              <option value="docent">Docent</option>
              <option value="gast">Gast (alleen lezen)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm mb-1">Wachtwoord</label>
            <input
              type="password"
              value={wachtwoord}
              onChange={(e) => setWachtwoord(e.target.value)}
              className="w-full rounded bg-zinc-950 border border-zinc-700 p-2 text-sm text-white"
              placeholder="Vul het TDA wachtwoord in"
            />
          </div>

          {fout && (
            <p className="text-sm text-red-400">{fout}</p>
          )}

          <button
            type="submit"
            className="w-full bg-pink-600 hover:bg-pink-700 transition-colors rounded py-2 text-sm font-semibold"
          >
            Inloggen
          </button>
        </form>

        <p className="mt-4 text-xs text-gray-500">
          Later kunnen we hier aparte accounts en wachtwoorden
          per persoon van maken. Nu is het nog één gedeeld wachtwoord.
        </p>
      </div>
    </main>
  );
}