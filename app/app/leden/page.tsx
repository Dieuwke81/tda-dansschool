"use client";

import { useEffect, useMemo, useState } from "react";
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
  if (schoon.length === 9) return "0" + schoon; // 612345678 -> 0612345678
  return schoon;
}

function formatTelefoon(nr: string) {
  return fixTelefoon(nr);
}

function formatWhatsAppUrl(nr: string) {
  const fixed = fixTelefoon(nr);
  if (!fixed) return "";
  let digits = fixed.replace(/\D/g, "");

  // We gaan uit van NL-nummer
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

/* ------------------------------------------------------ */

export default function LedenPage() {
  const [leden, setLeden] = useState<Lid[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [zoekTerm, setZoekTerm] = useState("");
  const [geselecteerdId, setGeselecteerdId] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(csvUrl);
        if (!res.ok) {
          throw new Error("Kon de ledenlijst niet ophalen");
        }
        const text = await res.text();
        const [, ...lines] = text.trim().split("\n");

        const data: Lid[] = lines
          .filter((line) => line.trim().length > 0)
          .map((line) => {
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

  // filter op naam of email
  const gefilterdeLeden = useMemo(() => {
    const zoek = zoekTerm.toLowerCase();
    return leden.filter((lid) => {
      return (
        lid.naam.toLowerCase().includes(zoek) ||
        lid.email.toLowerCase().includes(zoek)
      );
    });
  }, [leden, zoekTerm]);

  // zorg dat geselecteerdId geldig blijft
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
        <h1 className="text-2xl font-bold text-pink-500 mb-2">Leden</h1>
        <p className="text-gray-300 mb-4">
          Deze lijst komt direct uit je Google Sheet.
        </p>

        {/* 🔍 Zoekbalk bovenaan */}
        <div className="mb-4">
          <input
            type="text"
            placeholder="Zoek op naam of email…"
            value={zoekTerm}
            onChange={(e) => setZoekTerm(e.target.value)}
            className="w-full rounded bg-zinc-900 border border-zinc-700 p-2 text-white"
          />
        </div>

        {loading && <p className="text-gray-400">Laden…</p>}
        {error && <p className="text-red-400">{error}</p>}

        {!loading && !error && gefilterdeLeden.length === 0 && (
          <p className="text-gray-400">Geen leden gevonden.</p>
        )}

        {!loading && !error && gefilterdeLeden.length > 0 && (
          <div className="flex flex-col gap-4">
            {/* 📜 Scrolllijst met namen (ongeveer 5 regels hoog) */}
            <div className="bg-zinc-900 border border-zinc-700 rounded-xl overflow-hidden">
              <div className="px-4 py-2 border-b border-zinc-700 text-sm text-gray-300">
                {gefilterdeLeden.length} leden
              </div>
              <ul className="max-h-64 overflow-y-auto">
                {gefilterdeLeden.map((lid) => {
                  const actief = lid.id === geselecteerdId;
                  return (
                    <li key={lid.id || lid.email}>
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

            {/* 🧾 Detailkaart onder de lijst */}
            <div>
              {!geselecteerdLid ? (
                <p className="text-gray-400">
                  Kies een lid in de lijst om details te zien.
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
                    {/* Email */}
                    <Detail
                      label="Email"
                      value={
                        geselecteerdLid.email ? (
                          <a
                            href={`mailto:${geselecteerdLid.email}`}
                            className="text-pink-400 underline break-all"
                          >
                            {geselecteerdLid.email}
                          </a>
                        ) : (
                          <span>-</span>
                        )
                      }
                    />

                    {/* Telefoon + WhatsApp */}
                    <Detail
                      label="Telefoon"
                      value={
                        <>
                          {geselecteerdLid.tel1 && (
                            <div className="mb-1">
                              <a
                                href={`tel:${formatTelefoon(
                                  geselecteerdLid.tel1
                                )}`}
                                className="text-pink-400 underline"
                              >
                                {formatTelefoon(geselecteerdLid.tel1)}
                              </a>
                              <a
                                href={formatWhatsAppUrl(
                                  geselecteerdLid.tel1
                                )}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="ml-2 text-green-400 text-xs"
                              >
                                🟢 WhatsApp
                              </a>
                            </div>
                          )}
                          {geselecteerdLid.tel2 && (
                            <div>
                              <a
                                href={`tel:${formatTelefoon(
                                  geselecteerdLid.tel2
                                )}`}
                                className="text-pink-400 underline"
                              >
                                {formatTelefoon(geselecteerdLid.tel2)}
                              </a>
                              <a
                                href={formatWhatsAppUrl(
                                  geselecteerdLid.tel2
                                )}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="ml-2 text-green-400 text-xs"
                              >
                                🟢 WhatsApp
                              </a>
                            </div>
                          )}
                          {!geselecteerdLid.tel1 &&
                            !geselecteerdLid.tel2 && <span>-</span>}
                        </>
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
                      value={formatDatum(geselecteerdLid.geboortedatum) || "-"}
                    />
                    <Detail
                      label="Adres"
                      value={
                        geselecteerdLid.adres
                          ? `${geselecteerdLid.adres}\n${geselecteerdLid.postcode} ${geselecteerdLid.plaats}`
                          : "-"
                      }
                    />
                    <Detail
                      label="IBAN"
                      value={formatIban(geselecteerdLid.iban) || "-"}
                    />
                    <Detail
                      label="Datum akkoord voorwaarden"
                      value={
                        formatDatum(geselecteerdLid.datumGoedkeuring) || "-"
                      }
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </AuthGuard>
  );
}

function Detail({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-gray-400 mb-1">
        {label}
      </div>
      <div className="whitespace-pre-line text-sm">{value}</div>
    </div>
  );
}
