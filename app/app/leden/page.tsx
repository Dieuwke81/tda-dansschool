"use client";

import { useEffect, useMemo, useState } from "react";

type Lid = {
  id: string;
  naam: string;
  email: string;
  lesgroep: string;
  actief: string;
};

const csvUrl =
  "https://docs.google.com/spreadsheets/d/1xkDxiNuefHzYB__KPai0M5bXWIURporgFvKmnKTxAr4/export?format=csv&gid=0";

export default function LedenPage() {
  const [leden, setLeden] = useState<Lid[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [zoekTerm, setZoekTerm] = useState("");
  const [lesFilter, setLesFilter] = useState("alle");

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(csvUrl);
        if (!res.ok) {
          throw new Error("Kon de ledenlijst niet ophalen");
        }

        const text = await res.text();
        const [headerLine, ...lines] = text.trim().split("\n");

        const data: Lid[] = lines
          .filter((line) => line.trim().length > 0)
          .map((line) => {
            const cells = line.split(",");

            return {
              id: cells[0] ?? "",
              naam: cells[1] ?? "",
              email: cells[2] ?? "",
              lesgroep: cells[3] ?? "",
              actief: cells[4] ?? "",
            };
          });

        setLeden(data);
      } catch (err: any) {
        setError(err.message ?? "Er ging iets mis");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  // Unieke lesgroepen voor de dropdown
  const lesgroepen = useMemo(() => {
    const set = new Set<string>();
    leden.forEach((lid) => {
      if (lid.lesgroep && lid.lesgroep.trim() !== "") {
        set.add(lid.lesgroep.trim());
      }
    });
    return Array.from(set).sort();
  }, [leden]);

  // Filter op zoekterm + lesgroep
  const gefilterdeLeden = leden.filter((lid) => {
    const matchNaam = lid.naam
      .toLowerCase()
      .includes(zoekTerm.toLowerCase());

    const matchLes =
      lesFilter === "alle" || lid.lesgroep.trim() === lesFilter;

    return matchNaam && matchLes;
  });

  return (
    <main className="min-h-screen bg-black text-white p-6">
      <h1 className="text-2xl font-bold text-pink-500 mb-2">Leden</h1>
      <p className="text-gray-300 mb-4">
        Deze lijst komt direct uit je Google Sheet.
      </p>

      <div className="flex flex-col gap-3 mb-6">
        <input
          type="text"
          placeholder="Zoek op naam..."
          value={zoekTerm}
          onChange={(e) => setZoekTerm(e.target.value)}
          className="w-full rounded bg-zinc-900 border border-zinc-700 p-2 text-white"
        />

        <select
          value={lesFilter}
          onChange={(e) => setLesFilter(e.target.value)}
          className="w-full rounded bg-zinc-900 border border-zinc-700 p-2 text-white"
        >
          <option value="alle">Alle lesgroepen</option>
          {lesgroepen.map((les) => (
            <option key={les} value={les}>
              {les}
            </option>
          ))}
        </select>
      </div>

      {loading && <p className="text-gray-400">Laden…</p>}
      {error && <p className="text-red-400">{error}</p>}

      {!loading && !error && gefilterdeLeden.length === 0 && (
        <p className="text-gray-400">Geen leden gevonden.</p>
      )}

      {!loading && !error && gefilterdeLeden.length > 0 && (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="text-left py-2 pr-4">ID</th>
                <th className="text-left py-2 pr-4">Naam</th>
                <th className="text-left py-2 pr-4">Email</th>
                <th className="text-left py-2 pr-4">Lesgroep</th>
                <th className="text-left py-2 pr-4">Actief</th>
              </tr>
            </thead>
            <tbody>
              {gefilterdeLeden.map((lid) => (
                <tr key={lid.id} className="border-b border-gray-800">
                  <td className="py-2 pr-4">{lid.id}</td>
                  <td className="py-2 pr-4">{lid.naam}</td>
                  <td className="py-2 pr-4">{lid.email}</td>
                  <td className="py-2 pr-4">{lid.lesgroep}</td>
                  <td className="py-2 pr-4">{lid.actief}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}