"use client";

import { useEffect, useMemo, useState } from "react";

type Lid = {
  id: string;                    // kolom A
  naam: string;                  // kolom B
  email: string;                 // kolom C
  les: string;                   // kolom D
  les2: string;                  // kolom E
  soort: string;                 // kolom F
  toestemming: string;           // kolom G
  tel1: string;                  // kolom H
  tel2: string;                  // kolom I
  geboortedatum: string;         // kolom J
  adres: string;                 // kolom K
  postcode: string;              // kolom L
  plaats: string;                // kolom M
  iban: string;                  // kolom N
  datumGoedkeuring: string;      // kolom O
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
              les: cells[3] ?? "",
              les2: cells[4] ?? "",
              soort: cells[5] ?? "",
              toestemming: cells[6] ?? "",
              tel1: cells[7] ?? "",
              tel2: cells[8] ?? "",
              geboortedatum: cells[9] ?? "",
              adres: cells[10] ?? "",
              postcode: cells[11] ?? "",
              plaats: cells[12] ?? "",
              iban: cells[13] ?? "",
              datumGoedkeuring: cells[14] ?? "",
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

  // Unieke lesgroepen voor de dropdown (gebaseerd op eerste les)
  const lesgroepen = useMemo(() => {
    const set = new Set<string>();
    leden.forEach((lid) => {
      if (lid.les && lid.les.trim() !== "") {
        set.add(lid.les.trim());
      }
    });
    return Array.from(set).sort();
  }, [leden]);

  // Filter op zoekterm + lesgroep
  const gefilterdeLeden = leden.filter((lid) => {
    const zoek = zoekTerm.toLowerCase();
    const matchNaam =
      lid.naam.toLowerCase().includes(zoek) ||
      lid.email.toLowerCase().includes(zoek);

    const matchLes =
      lesFilter === "alle" ||
      lid.les.trim() === lesFilter ||
      lid.les2.trim() === lesFilter;

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
          placeholder="Zoek op naam of email..."
          value={zoekTerm}
          onChange={(e) => setZoekTerm(e.target.value)}
          className="w-full rounded bg-zinc-900 border border-zinc-700 p-2 text-white"
        />

        <select
          value={lesFilter}
          onChange={(e) => setLesFilter(e.target.value)}
          className="w-full rounded bg-zinc-900 border border-zinc-700 p-2 text-white"
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
      {error && <p className="text-red-400">{error}</p>}

      {!loading && !error && gefilterdeLeden.length === 0 && (
        <p className="text-gray-400">Geen leden gevonden.</p>
      )}

      {!loading && !error && gefilterdeLeden.length > 0 && (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="text-left py-2 pr-4">Naam</th>
                <th className="text-left py-2 pr-4">Email</th>
                <th className="text-left py-2 pr-4">Les</th>
                <th className="text-left py-2 pr-4">2e Les</th>
                <th className="text-left py-2 pr-4">Soort</th>
                <th className="text-left py-2 pr-4">Toestemming</th>
                <th className="text-left py-2 pr-4">Telefoon</th>
                <th className="text-left py-2 pr-4">Geboortedatum</th>
                <th className="text-left py-2 pr-4">Adres</th>
                <th className="text-left py-2 pr-4">Postcode</th>
                <th className="text-left py-2 pr-4">Plaats</th>
                <th className="text-left py-2 pr-4">IBAN</th>
                <th className="text-left py-2 pr-4">Datum akkoord</th>
              </tr>
            </thead>
            <tbody>
              {gefilterdeLeden.map((lid) => (
                <tr key={lid.id} className="border-b border-gray-800">
                  <td className="py-2 pr-4">{lid.naam}</td>
                  <td className="py-2 pr-4">{lid.email}</td>
                  <td className="py-2 pr-4 whitespace-pre-line">{lid.les}</td>
                  <td className="py-2 pr-4 whitespace-pre-line">{lid.les2}</td>
                  <td className="py-2 pr-4">{lid.soort}</td>
                  <td className="py-2 pr-4">{lid.toestemming}</td>
                  <td className="py-2 pr-4 whitespace-pre-line">
                    {lid.tel1}
                    {lid.tel2 ? `\n${lid.tel2}` : ""}
                  </td>
                  <td className="py-2 pr-4">{lid.geboortedatum}</td>
                  <td className="py-2 pr-4">{lid.adres}</td>
                  <td className="py-2 pr-4">{lid.postcode}</td>
                  <td className="py-2 pr-4">{lid.plaats}</td>
                  <td className="py-2 pr-4">{lid.iban}</td>
                  <td className="py-2 pr-4">{lid.datumGoedkeuring}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
