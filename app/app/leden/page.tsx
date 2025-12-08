"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import AuthGuard from "../auth-guard";

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
  if (schoon.length === 0) return "";
  if (schoon.length === 9) return "0" + schoon;
  return schoon;
}

function formatTelefoon(nr: string) {
  return fixTelefoon(nr);
}

function formatWhatsAppUrl(nr: string) {
  const fixed = fixTelefoon(nr);
  if (!fixed) return "";
  let digits = fixed.replace(/\D/g, "");

  if (digits.startsWith("0031")) {
    digits = "31" + digits.slice(4);
  } else if (digits.startsWith("0")) {
    digits = "31" + digits.slice(1);
  }
  return `https://wa.me/${digits}`;
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

function isVandaagJarig(geboorte: string) {
  if (!geboorte) return false;
  const parts = geboorte.split(/[-/.]/);
  if (parts.length !== 3) return false;

  const dag = parseInt(parts[0], 10);
  const maand = parseInt(parts[1], 10);
  if (!dag || !maand) return false;

  const vandaag = new Date();
  return (
    vandaag.getDate() === dag &&
    vandaag.getMonth() + 1 === maand
  );
}

/* ------------------------------------------------------ */

export default function LedenPage() {
  const [leden, setLeden] = useState<Lid[]>([]);
  const [loading, setLoading] = useState(true);
  const [zoekTerm, setZoekTerm] = useState("");
  const [geselecteerdId, setGeselecteerdId] = useState<string | null>(null);

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
      if (data.length > 0) setGeselecteerdId(data[0].id);
      setLoading(false);
    }
    load();
  }, []);

  const verjaardagenVandaag = useMemo(() => {
    return leden.filter((lid) =>
      isVandaagJarig(lid.geboortedatum)
    );
  }, [leden]);

  const gefilterdeLeden = useMemo(() => {
    const zoek = zoekTerm.toLowerCase();
    return leden.filter((lid) => {
      return (
        lid.naam.toLowerCase().includes(zoek) ||
        lid.email.toLowerCase().includes(zoek)
      );
    });
  }, [leden, zoekTerm]);

  useEffect(() => {
    if (gefilterdeLeden.length === 0) {
      setGeselecteerdId(null);
      return;
    }
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
    <AuthGuard allowedRoles={["eigenaar", "docent"]}>
      <main className="min-h-screen bg-black text-white p-4 md:p-6">

        {/* 🎂 VERJAARDAGEN VANDAAG */}
        {verjaardagenVandaag.length > 0 && (
          <div className="mb-4 bg-pink-500/20 border border-pink-500 rounded-xl p-4 text-pink-300">
            <strong>🎉 Vandaag jarig:</strong>{" "}
            {verjaardagenVandaag.map((l) => l.naam).join(", ")}
          </div>
        )}

        <input
          type="text"
          placeholder="Zoek op naam of email…"
          value={zoekTerm}
          onChange={(e) => setZoekTerm(e.target.value)}
          className="w-full mb-4 rounded bg-zinc-900 border border-zinc-700 p-2 text-white"
        />

        <div className="bg-zinc-900 border border-zinc-700 rounded-xl overflow-hidden mb-4">
          <ul className="max-h-64 overflow-y-auto">
            {gefilterdeLeden.map((lid) => (
              <li key={lid.id}>
                <button
                  onClick={() => setGeselecteerdId(lid.id)}
                  className="w-full text-left px-4 py-3 border-b border-zinc-800 hover:bg-zinc-800"
                >
                  {lid.naam}
                </button>
              </li>
            ))}
          </ul>
        </div>

        {geselecteerdLid && (
          <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-4">
            <div className="font-bold text-pink-400 mb-2">
              {geselecteerdLid.naam}
            </div>

            <div className="text-sm mb-1">
              📧{" "}
              <a
                href={`mailto:${geselecteerdLid.email}`}
                className="text-pink-400 underline"
              >
                {geselecteerdLid.email}
              </a>
            </div>

            <div className="text-sm mb-1">
              📞{" "}
              <a
                href={`tel:${formatTelefoon(geselecteerdLid.tel1)}`}
                className="text-pink-400 underline"
              >
                {formatTelefoon(geselecteerdLid.tel1)}
              </a>{" "}
              <a
                href={formatWhatsAppUrl(geselecteerdLid.tel1)}
                target="_blank"
                className="ml-2"
              >
                <img src="/whatsapp.png" className="inline w-5 h-5" />
              </a>
            </div>

            <div className="text-sm">
              🎂 {formatDatum(geselecteerdLid.geboortedatum)}
            </div>
          </div>
        )}
      </main>
    </AuthGuard>
  );
}
