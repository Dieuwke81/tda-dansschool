
"use client";

import { useEffect, useMemo, useState } from "react";
import AuthGuard from "../auth-guard";

/* ================= TYPES ================= */

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
  datumGoedkeuring: string;
};

/* ================= HELPERS ================= */

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (ch === "," && !inQuotes) {
      out.push(cur.trim());
      cur = "";
      continue;
    }
    cur += ch;
  }
  out.push(cur.trim());
  return out;
}

const clean = (s: unknown) => String(s ?? "").trim();
const norm = (s: unknown) =>
  clean(s).replace(/\u00A0/g, " ").replace(/\s+/g, " ").toLowerCase();

const lidKey = (l: Lid) => clean(l.id) || clean(l.email) || clean(l.naam);

function soortLabel(raw: unknown) {
  const x = norm(raw);
  if (x.includes("rit")) return "Rittenkaart";
  if (x.includes("abon")) return "Abonnement";
  return "-";
}

function soortType(raw: unknown) {
  const x = norm(raw);
  if (x.includes("rit")) return "rittenkaart";
  if (x.includes("abon")) return "abonnement";
  return "overig";
}

/* ================= KLEUREN ================= */

const rainbow = [
  { bg: "bg-red-500/10", border: "border-red-400/70", text: "text-red-300" },
  { bg: "bg-orange-500/10", border: "border-orange-400/70", text: "text-orange-300" },
  { bg: "bg-yellow-500/10", border: "border-yellow-400/70", text: "text-yellow-300" },
  { bg: "bg-green-500/10", border: "border-green-400/70", text: "text-green-300" },
  { bg: "bg-blue-500/10", border: "border-blue-400/70", text: "text-blue-300" },
  { bg: "bg-purple-500/10", border: "border-purple-400/70", text: "text-purple-300" },
];

/* ================= GROEPEREN ================= */

function groupByLes(leden: Lid[]) {
  const map = new Map<string, Lid[]>();

  for (const l of leden) {
    if (l.les) map.set(l.les, [...(map.get(l.les) ?? []), l]);
    if (l.les2) map.set(l.les2, [...(map.get(l.les2) ?? []), l]);
  }

  return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0], "nl"));
}

function countSoorten(lijst: Lid[]) {
  let abonnement = 0;
  let rittenkaart = 0;
  lijst.forEach((l) => {
    const t = soortType(l.soort);
    if (t === "abonnement") abonnement++;
    if (t === "rittenkaart") rittenkaart++;
  });
  return { totaal: lijst.length, abonnement, rittenkaart };
}

/* ================= PAGE ================= */

export default function LedenPage() {
  const [leden, setLeden] = useState<Lid[]>([]);
  const [zoekTerm, setZoekTerm] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/leden", { cache: "no-store" })
      .then((r) => r.text())
      .then((t) => {
        const lines = t.trim().split("\n");
        if (lines.length < 2) {
          setLeden([]);
          setLoading(false);
          return;
        }

        const [, ...rows] = lines;
        setLeden(
          rows
            .filter((x) => x.trim().length > 0)
            .map((line) => {
              const c = parseCsvLine(line);
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
                datumGoedkeuring: c[13] ?? "",
              };
            })
        );

        setLoading(false);
      })
      .catch(() => {
        setLeden([]);
        setLoading(false);
      });
  }, []);

  const gefilterd = useMemo(() => {
    const z = norm(zoekTerm);
    if (!z) return leden;
    return leden.filter(
      (l) =>
        norm(l.naam).includes(z) ||
        norm(l.email).includes(z) ||
        norm(l.les).includes(z) ||
        norm(l.les2).includes(z)
    );
  }, [leden, zoekTerm]);

  const groepen = useMemo(() => groupByLes(gefilterd), [gefilterd]);

  return (
    <AuthGuard allowedRoles={["eigenaar", "docent"]}>
      <main className="min-h-screen bg-black text-white">
        {/* ===== STICKY HEADER ===== */}
        <header className="sticky top-0 z-40 w-full border-b border-pink-500/35 bg-black/75 backdrop-blur-md supports-[backdrop-filter]:bg-black/55 shadow-[0_4px_20px_rgba(255,0,128,0.05)]">
          <div className="px-4 py-5 flex flex-col items-center text-center">
            <h1 className="text-3xl font-extrabold text-pink-400 tracking-tight">
              Leden
            </h1>

            <div className="mt-3 w-full max-w-md">
              <input
                value={zoekTerm}
                onChange={(e) => setZoekTerm(e.target.value)}
                placeholder="Zoek op naam, email of les…"
                className="w-full rounded-lg bg-zinc-900/70 border border-zinc-600/80 px-3 py-2 text-white placeholder:text-gray-400 outline-none focus:border-pink-400/70 focus:ring-2 focus:ring-pink-500/20"
              />
            </div>
          </div>
        </header>

        {/* ===== CONTENT ===== */}
        <div className="p-4 pt-5">
          {loading && <p className="text-gray-400">Laden…</p>}

          {!loading && groepen.length === 0 && (
            <p className="text-gray-400">Geen leden gevonden.</p>
          )}

          <div className="space-y-4">
            {groepen.map(([les, lijst], i) => {
              const kleur = rainbow[i % rainbow.length];
              const c = countSoorten(lijst);

              return (
                <section
                  key={les}
                  className={`rounded-2xl border ${kleur.border} ${kleur.bg} overflow-hidden shadow-[0_8px_30px_rgba(0,0,0,0.25)] transition-transform hover:scale-[1.01] hover:shadow-[0_8px_40px_rgba(255,255,255,0.08)]`}
                >
                  <div className="px-4 py-3 border-b border-white/10">
                    <div className={`font-semibold ${kleur.text}`}>{les}</div>
                    <div className="text-sm text-gray-300 mt-1">
                      {c.totaal} leden • {c.abonnement} abonnement •{" "}
                      {c.rittenkaart} rittenkaart
                    </div>
                  </div>

                  <ul>
                    {lijst.map((l) => (
                      <li
                        key={lidKey(l)}
                        className="px-4 py-3 border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors"
                      >
                        <div className="font-medium">{l.naam}</div>
                        <div className="text-xs text-gray-400">
                          {soortLabel(l.soort)}
                        </div>
                      </li>
                    ))}
                  </ul>
                </section>
              );
            })}
          </div>
        </div>
      </main>
    </AuthGuard>
  );
}
