
"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import AuthGuard from "../auth-guard";

/* ================= TYPES ================= */

type Rol = "eigenaar" | "docent" | "gast" | "lid";

type SessionResponse = {
  loggedIn?: boolean;
  rol?: Rol;
};

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

function getDagMaand(raw: string) {
  const p = raw.split(/[-/.]/);
  if (p.length !== 3) return null;
  return { dag: +p[0], maand: +p[1] };
}

/* ================= KLEUREN ================= */

const rainbow = [
  {
    bg: "bg-red-500/10",
    border: "border-red-400/60",
    text: "text-red-400",
  },
  {
    bg: "bg-orange-500/10",
    border: "border-orange-400/60",
    text: "text-orange-400",
  },
  {
    bg: "bg-yellow-500/10",
    border: "border-yellow-400/60",
    text: "text-yellow-400",
  },
  {
    bg: "bg-green-500/10",
    border: "border-green-400/60",
    text: "text-green-400",
  },
  {
    bg: "bg-blue-500/10",
    border: "border-blue-400/60",
    text: "text-blue-400",
  },
  {
    bg: "bg-purple-500/10",
    border: "border-purple-400/60",
    text: "text-purple-400",
  },
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
    fetch("/api/leden")
      .then((r) => r.text())
      .then((t) => {
        const [, ...rows] = t.trim().split("\n");
        setLeden(
          rows.map((l) => {
            const c = parseCsvLine(l);
            return {
              id: c[0],
              naam: c[1],
              email: c[2],
              les: c[3],
              les2: c[4],
              soort: c[5],
              toestemming: c[6],
              tel1: c[7],
              tel2: c[8],
              geboortedatum: c[9],
              adres: c[10],
              postcode: c[11],
              plaats: c[12],
              datumGoedkeuring: c[13],
            };
          })
        );
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

        {/* ===== HEADER ===== */}
        <div className="w-full border-b border-pink-500/30 bg-zinc-900/80 px-4 py-4">
          <h1 className="text-2xl font-bold text-pink-400">Leden</h1>
        </div>

        <div className="p-4">

          {/* ===== ZOEK ===== */}
          <input
            value={zoekTerm}
            onChange={(e) => setZoekTerm(e.target.value)}
            placeholder="Zoek op naam, email of les…"
            className="mb-4 w-full rounded bg-zinc-900 border border-zinc-700 p-2"
          />

          {loading && <p className="text-gray-400">Laden…</p>}

          <div className="space-y-4">
            {groepen.map(([les, lijst], i) => {
              const kleur = rainbow[i % rainbow.length];
              const c = countSoorten(lijst);

              return (
                <div
                  key={les}
                  className={`rounded-xl border ${kleur.border} ${kleur.bg}`}
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
                        className="px-4 py-3 border-b border-white/5 last:border-0 hover:bg-white/5"
                      >
                        <div className="font-medium">{l.naam}</div>
                        <div className="text-xs text-gray-400">
                          {soortLabel(l.soort)}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>
      </main>
    </AuthGuard>
  );
}
