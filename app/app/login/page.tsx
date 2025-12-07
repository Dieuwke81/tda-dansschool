"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [wachtwoord, setWachtwoord] = useState("");
  const [fout, setFout] = useState("");
  const router = useRouter();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    // TIJDELIJK, ALLEEN VOOR TESTEN:
    const juistWachtwoord = "tda1234";

    if (wachtwoord === juistWachtwoord) {
      // markeer "ingelogd" in de browser
      if (typeof window !== "undefined") {
        localStorage.setItem("tda_ingelogd", "ja");
      }
      // ga naar de startpagina
      router.push("/");
    } else {
      setFout("Onjuist wachtwoord");
    }
  }

  return (
    <main className="min-h-screen bg-black text-white flex items-center justify-center p-6">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-xs bg-zinc-900 p-6 rounded-lg border border-zinc-700"
      >
        <h1 className="text-xl font-bold mb-4 text-pink-500">Inloggen</h1>

        <p className="text-sm text-gray-300 mb-4">
          Vul het beheerders­wachtwoord in om de beheeromgeving te openen.
        </p>

        <label className="block mb-3">
          <span className="text-sm text-gray-300">
            Beheerders­wachtwoord
          </span>
          <input
            type="password"
            value={wachtwoord}
            onChange={(e) => setWachtwoord(e.target.value)}
            className="mt-1 w-full rounded bg-black border border-zinc-700 p-2 text-white"
          />
        </label>

        {fout && <p className="text-red-400 text-sm mb-2">{fout}</p>}

        <button
          type="submit"
          className="w-full bg-pink-600 hover:bg-pink-700 rounded py-2 font-semibold"
        >
          Inloggen
        </button>

        <p className="text-xs text-gray-500 mt-3">
          (Test­wachtwoord: <span className="font-mono">tda1234</span>)
        </p>
      </form>
    </main>
  );
}