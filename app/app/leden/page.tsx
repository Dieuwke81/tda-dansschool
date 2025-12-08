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
  const [geselecteerdId, setGeselecteerdId] = useState<string | null>(null);

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
        // standaard: eerste lid selecteren (als er 1 is)
        if (data.length > 0) {
          setGeselecteerdId(data[0].id);
        }
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
    const matchNaamOfEmail =
      lid.naam.toLowerCase().includes(zoek) ||
      lid.email.toLowerCase().includes(zoek);

    const matchLes =
      lesFilter === "alle" ||
      lid.les.trim() === lesFilter ||
      lid.les2.trim() === lesFilter;

    return matchNaamOfEmail && matchLes;
  });

  // Zorg dat er altijd een geldige selectie is als de filter verandert
  useEffect(() => {
    if (gefilterdeLeden.length === 0) {
      setGeselecteerdId(null);
      return;
    }
    // als huidige selectie niet meer in de gefilterde lijst staat -> kies eerste
    const bestaatNog = gefilterdeLeden.some(
      (lid) => lid.id === geselecteerdId
    );
    if (!bestaatNog) {
      setGeselecteerdId(gefilterdeLeden[0].id);
    }
  }, [gefilterdeLeden, geselecteerdId]);

  const geselecteerdLid =
    gefilterdeLeden.find((lid) => lid.id === geselecteerdId) ?? null;

  return (
    <main className="min-h-screen bg-black text-white p-6">
      <h1 className="text-2xl font-bold text-pink-500 mb-2">Leden</h1>
      <p className="text-gray-300 mb-4">
        Deze lijst komt direct uit je Google Sheet.
      </p>

      {/* Filters */}
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
        <div className="flex flex-col md:flex-row gap-4">
          {/* LINKERKANT: lijst met namen */}
          <div className="md:w-1/3">
            <div className="bg-zinc-900 border border-zinc-700 rounded-xl overflow-hidden">
              <div className="px-4 py-2 border-b border-zinc-700 text-sm text-gray-300">
                {gefilterdeLeden.length} leden
              </div>
              <ul className="max-h-[70vh] overflow-y-auto">
                {gefilterdeLeden.map((lid) => {
                  const actief = lid.id === geselecteerdId;
                  return (
                    <li key={lid.id}>
                      <button
                        type="button"
                        onClick={() => setGeselecteerdId(lid.id)}
                        className={`w-full text-left px-4 py-3 text-sm border-b border-zinc-800 hover:bg-zinc-800/80 transition-colors ${
                          actief ? "bg-pink-500/20" : ""
                        }`}
                      >
                        <div className="font-semibold">{lid.naam}</div>
                        <div className="text-xs text-gray-400 truncate">
                          {lid.les || lid.les2 || "Geen les ingevuld"}
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>

          {/* RECHTERKANT: detailkaart */}
          <div className="md:flex-1">
            {!geselecteerdLid ? (
              <p className="text-gray-400">
                Kies een lid in de lijst om de details te zien.
              </p>
            ) : (
              <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-6 space-y-4">
                <div>
                  <h2 className="text-xl font-bold text-pink-400 mb-1">
                    {geselecteerdLid.naam}
                  </h2>
                  <p className="text-sm text-gray-400">
                    {geselecteerdLid.les}
                    {geselecteerdLid.les2
                      ? ` • 2e les: ${geselecteerdLid.les2}`
                      : ""}
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  <Detail label="Email" value={geselecteerdLid.email} />
                  <Detail
                    label="Telefoon"
                    value={
                      geselecteerdLid.tel2
                        ? `${geselecteerdLid.tel1}\n${geselecteerdLid.tel2}`
                        : geselecteerdLid.tel1
                    }
                  />
                  <Detail
                    label="Soort"
                    value={geselecteerdLid.soort || "-"}
                  />
                  <Detail
                    label="Toestemming beeldmateriaal"
                    value={geselecteerdLid.toestemming || "-"}
                  />
                  <Detail
                    label="Geboortedatum"
                    value={geselecteerdLid.geboortedatum || "-"}
                  />
                  <Detail
                    label="Adres"
                    value={
                      geselecteerdLid.adres
                        ? `${geselecteerdLid.adres}\n${geselecteerdLid.postcode} ${geselecteerdLid.plaats}`
                        : "-"
                    }
                  />
                  <Detail label="IBAN" value={geselecteerdLid.iban || "-"} />
                  <Detail
                    label="Datum akkoord voorwaarden"
                    value={geselecteerdLid.datumGoedkeuring || "-"}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}

// Kleine helper-component voor een label + waarde
function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-gray-400 mb-1">
        {label}
      </div>
      <div className="whitespace-pre-line text-sm">{value}</div>
    </div>
  );
}
