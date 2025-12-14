
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type MijnData = {
  naam: string;
  email: string;
  les: string;
  tweedeLes: string;
  soort: string;
  toestemmingBeeldmateriaal: string;
  telefoon1: string;
  telefoon2: string;
  geboortedatum: string;
  adres: string;
  postcode: string;
  plaats: string;
};

type SessionResponse = {
  loggedIn?: boolean;
  rol?: "eigenaar" | "docent" | "gast" | "lid";
  username?: string;
  mustChangePassword?: boolean;
};

export default function MijnPagina() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<MijnData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        // 1) sessie check
        const sres = await fetch("/api/session", {
          cache: "no-store",
          credentials: "same-origin",
        });

        const sdata = (await sres.json().catch(() => null)) as SessionResponse | null;

        if (!sres.ok || !sdata?.loggedIn || !sdata?.rol) {
          router.replace("/login");
          return;
        }

        // 2) force wachtwoord wijzigen
        if (sdata.rol === "lid" && sdata.mustChangePassword === true) {
          router.replace("/wachtwoord");
          return;
        }

        // 3) haal mijn gegevens op
        const res = await fetch("/api/mijn", { cache: "no-store" });
        const d = await res.json().catch(() => null);

        if (!res.ok) {
          if (!cancelled) {
            setError(d?.error || "Kon je gegevens niet ophalen");
            if (res.status === 401) router.replace("/login");
          }
          return;
        }

        if (!d) {
          if (!cancelled) setError("Kon je gegevens niet ophalen (lege response)");
          return;
        }

        if (!cancelled) setData(d as MijnData);
      } catch {
        if (!cancelled) setError("Kon je gegevens niet ophalen");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [router]);

  async function uitloggen() {
    try {
      await fetch("/api/logout", { method: "POST" });
    } catch {}
    router.replace("/login");
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center">
        <p className="text-gray-300">Je gegevens worden geladen…</p>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6 text-center">
        <p className="text-red-400 mb-4">{error}</p>
        <button onClick={uitloggen} className="text-gray-400 underline text-sm">
          Uitloggen
        </button>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6 text-center">
        <p className="text-gray-300 mb-4">Geen gegevens gevonden.</p>
        <button onClick={uitloggen} className="text-gray-400 underline text-sm">
          Uitloggen
        </button>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-xl bg-zinc-900 rounded-xl p-6 border border-zinc-700">
        <h1 className="text-2xl font-bold text-pink-500 mb-4">Mijn gegevens</h1>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <Field label="Naam" value={data.naam} />
          <Field label="Email" value={data.email} />
          <Field label="Les" value={data.les} />
          <Field label="2e les" value={data.tweedeLes} />
          <Field label="Soort" value={data.soort} />
          <Field label="Toestemming beeldmateriaal" value={data.toestemmingBeeldmateriaal} />
          <Field label="Telefoon 1" value={data.telefoon1} />
          <Field label="Telefoon 2" value={data.telefoon2} />
          <Field label="Geboortedatum" value={data.geboortedatum} />
          <Field label="Adres" value={data.adres} />
          <Field label="Postcode" value={data.postcode} />
          <Field label="Plaats" value={data.plaats} />
        </div>

        <div className="mt-6 flex justify-end">
          <button onClick={uitloggen} className="text-gray-400 underline text-sm">
            Uitloggen
          </button>
        </div>
      </div>
    </main>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-black/40 rounded-lg border border-zinc-800 p-3">
      <div className="text-gray-400 mb-1">{label}</div>
      <div className="text-white break-words">{value || "-"}</div>
    </div>
  );
}
