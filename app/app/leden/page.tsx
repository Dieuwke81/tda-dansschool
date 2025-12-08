"use client";

import { useEffect, useMemo, useState } from "react";

type Lid = {
  id: string;
  naam: string;
  email: string;
  les: string;
  les2: string;
  soort: string;
  toestemming: string;
  tel1: string;
  tel2: string;
  geboortedatum: string;
  adres: string;
  postcode: string;
  plaats: string;
  iban: string;
  datumGoedkeuring: string;
};

const csvUrl =
  "https://docs.google.com/spreadsheets/d/1xkDxiNuefHzYB__KPai0M5bXWIURporgFvKmnKTxAr4/export?format=csv&gid=0";

/* -------------------- HULPFUNCTIES -------------------- */

function fixTelefoon(nr: string) {
  if (!nr) return "";
  const schoon = nr.replace(/\D/g, "");
  if (schoon.length === 9) return "0" + schoon;
  return schoon;
}

function formatTelefoon(nr: string) {
  return fixTelefoon(nr);
}

function formatIban(iban: string) {
  if (!iban) return "";
  const clean = iban.replace(/\s+/g, "").toUpperCase();
  return clean.replace(/(.{4})/g, "$1 ").trim();
}

function formatDatum(raw: string) {
  if (!raw) return "";
  const parts = raw.split(/[-/.]/);
  if (parts.length !== 3) return raw;

  const d = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  let y = parts[2];

  if (!d || !m) return raw;
  if (y.length === 2) y = "20" + y;

  return `${d.toString().padStart(2, "0")}-${m
    .toString()
    .padStart(2, "0")}-${y}`;
}

/* ------------------------------------------------------ */

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
          les2: c[4] ?? "",
          soort: c[5] ?? "",
          toestemming: c[6] ?? "",
          tel1: c[7] ?? "",
          tel2: c[8] ?? "",
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
      if (lid.les2) set.add(lid.les2);
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
      lid.les2 === lesFilter;

    return matchNaam && matchLes;
  });

  return (
    <main className="min-h-screen bg-black text-white p-4 md:p-6">
      <h1 className="text-2xl font-bold text-pink-500 mb-4">Leden</h1>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-3 mb-6">
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
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="text-left py-2 pr-4">Naam</th>
                <th className="text-left py-2 pr-4">Email</th>
                <th className="text-left py-2 pr-4">Telefoon</th>
                <th className="text-left py-2 pr-4">Les</th>
                <th className="text-left py-2 pr-4">Geboortedatum</th>
                <th className="text-left py-2 pr-4">Plaats</th>
                <th className="text-left py-2 pr-4">IBAN</th>
              </tr>
            </thead>
