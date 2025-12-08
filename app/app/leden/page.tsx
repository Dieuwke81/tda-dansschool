"use client";

import { useEffect, useMemo, useState } from "react";
import AuthGuard from "../auth-guard";

type Lid = {
  id: string;
  naam: string;
  email: string;
  les: string;
  tweedeLes: string;
  soort: string;
  toestemming: string;
  telefoon1: string;
  telefoon2: string;
  geboortedatum: string;
  adres: string;
  postcode: string;
  plaats: string;
  iban: string;
  datumGoedkeuring: string;
};

const csvUrl =
  "https://docs.google.com/spreadsheets/d/1xkDxiNuefHzYB__KPai0M5bXWIURporgFvKmnKTxAr4/export?format=csv&gid=0";

export default function LedenPage() {
  const [leden, setLeden] = useState<Lid[]>([]);
  const [loading, setLoading] = useState(true);
  const [zoekTerm, setZoekTerm] = useState("");
  const [lesFilter, setLesFilter] = useState("alle");

  useEffect(() => {
    async function load() {
      const res = await fetch(csvUrl);
      const text = await res.text();
      const [, ...lines] = text.trim().split("\n");

      const data: Lid[] = lines.map((line) => {
        const c = line.split(",");

        return {
          id: c[0] ?? "",
          naam: c[1] ?? "",
          email: c[2] ?? "",
          les: c[3] ?? "",
          tweedeLes: c[4] ?? "",
          soort: c[5] ?? "",
          toestemming: c[6] ?? "",
          telefoon1: c[7] ?? "",
          telefoon2: c[8] ?? "",
          geboortedatum: c[9] ?? "",
          adres: c[10] ?? "",
          postcode: c[11] ?? "",
          plaats: c[12] ?? "",
          iban: c[13] ?? "",
          datumGoedkeuring: c[14] ?? "",
        };
      });

      setLeden(data);
      setLoading(false);
    }

    load();
  }, []);

  const lesgroepen = useMemo(() => {
    const set = new Set<string>();
    leden.forEach((lid) => {
      if (lid.les) set.add(lid.les);
      if (lid.tweedeLes) set.add(lid.tweedeLes);
    });
    return Array.from(set).sort();
  }, [leden]);

  const gefilterdeLeden = leden.filter((lid) => {
    const matchNaam = lid.naam
      .toLowerCase()
      .includes(zoekTerm.toLowerCase());

    const matchLes =
      lesFilter === "alle" ||
      lid.les === lesFilter ||
      lid.tweedeLes === lesFilter;

    return matchNaam && matchLes;
  });

  return (
    <AuthGuard allowedRoles={["eigenaar", "docent"]}>
      <main className="min-h-screen bg-black text-white p-6">
        <h1 className="text-2xl font-bold text-pink-500 mb-4">Leden</h1>

        {/* Filters */}
        <div className="flex flex-col gap-3 mb-6">
          <input
            type="text"
            placeholder="Zoek op naam..."
            value={zoekTerm}
            onChange={(e) => setZoekTerm(e.target.value)}
            className="rounded bg-zinc-900 border border-zinc-700 p-2 text-white"
          />

          <select
            value={lesFilter}
            onChange={(e) => setLesFilter(e.target.value)}
            className="rounded bg-zinc-900 border border-zinc-700 p-2 text-white"
          >
            <option value="alle">Alle lessen</option>
            {lesgroepen.map((les) => (
              <option key={les} value={les}>
                {les}
              </option>
            ))}
          </select>
        </div>

        {loading && <p className="text-gray-400">Laden…</p>}

        {!loading && (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm border border-zinc-800">
              <thead className="bg-zinc-900">
                <tr>
                  <th className="p-2">Naam</th>
                  <th className="p-2">Email</th>
                  <th className="p-2">Les</th>
                  <th className="p-2">2e Les</th>
                  <th className="p-2">Soort</th>
                  <th className="p-2">Toestemming</th>
                  <th className="p-2">Telefoon</th>
                  <th className="p-2">Geboortedatum</th>
                  <th className="p-2">Plaats</th>
                </tr>
              </thead>
              <tbody>
                {gefilterdeLeden.map((lid) => (
                  <tr
                    key={lid.id}
                    className="border-t border-zinc-800 hover:bg-zinc-900"
                  >
                    <td className="p-2">{lid.naam}</td>
                    <td className="p-2">{lid.email}</td>
                    <td className="p-2">{lid.les}</td>
                    <td className="p-2">{lid.tweedeLes}</td>
                    <td className="p-2">{lid.soort}</td>
                    <td className="p-2">{lid.toestemming}</td>
                    <td className="p-2">
                      {lid.telefoon1}
                      {lid.telefoon2 && (
                        <span className="block text-xs text-gray-400">
                          {lid.telefoon2}
                        </span>
                      )}
                    </td>
                    <td className="p-2">{lid.geboortedatum}</td>
                    <td className="p-2">{lid.plaats}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </AuthGuard>
  );
}
