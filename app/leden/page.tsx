
"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import AuthGuard from "../auth-guard";

/* ================= TYPES ================= */

type Rol = "eigenaar" | "docent" | "gast" | "lid";

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

/* ================= HULPFUNCTIES ================= */

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

function countSoorten(lijst: Lid[]) {
  let abonnement = 0;
  let rittenkaart = 0;
  lijst.forEach((l) => {
    const t = soortType(l.soort);
    if (t === "abonnement") abonnement++;
    if (t === "rittenkaart") rittenkaart++;
  });
  return { abonnement, rittenkaart, totaal: lijst.length };
}

/* ================= GROEPEREN ================= */

function groupByLesBoth(leden: Lid[]) {
  const map = new Map<string, Lid[]>();
  const add = (les: string, lid: Lid) => {
    const k = clean(les);
    if (!k) return;
    if (!map.has(k)) map.set(k, []);
    map.get(k)!.push(lid);
  };
  leden.forEach((l) => {
    add(l.les, l);
    add(l.les2, l);
  });
  return Array.from(map.entries()).sort((a, b) =>
    a[0].localeCompare(b[0], "nl")
  );
}

/* ================= KLEUREN ================= */

const rainbow = [
  "from-red-500/10 to-red-500/5 border-red-400/40 text-red-300",
  "from-orange-500/10 to-orange-500/5 border-orange-400/40 text-orange-300",
  "from-yellow-500/10 to-yellow-500/5 border-yellow-400/40 text-yellow-300",
  "from-green-500/10 to-green-500/5 border-green-400/40 text-green-300",
  "from-cyan-500/10 to-cyan-500/5 border-cyan-400/40 text-cyan-300",
  "from-blue-500/10 to-blue-500/5 border-blue-400/40 text-blue-300",
  "from-purple-500/10 to-purple-500/5 border-purple-400/40 text-purple-300",
];

/* ================= PAGINA ================= */

export default function LedenPage() {
  const [leden, setLeden] = useState<Lid[]>([]);
  const [zoek, setZoek] = useState("");
  const [loading, setLoading] = useState(true);
  const [geselecteerd, setGeselecteerd] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const r = await fetch("/api/leden", { cache: "no-store" });
      const t = await r.text();
      const [, ...rows] = t.trim().split("\n");

      setLeden(
        rows.map((l) => {
          const c = parseCsvLine(l);
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
    }
    load();
  }, []);

  const gefilterd = useMemo(() => {
    const z = norm(zoek);
    if (!z) return leden;
    return leden.filter(
      (l) =>
        norm(l.naam).includes(z) ||
        norm(l.email).includes(z) ||
        norm(l.les).includes(z) ||
        norm(l.les2).includes(z)
    );
  }, [leden, zoek]);

  const groepen = useMemo(() => groupByLesBoth(gefilterd), [gefilterd]);

  return (
    <AuthGuard allowedRoles={["eigenaar", "docent"]}>
      <main className="min-h-screen bg-black text-white">
        {/* ===== STICKY HEADER ===== */}
        <div className="sticky top-0 z-30 bg-black/90 backdrop-blur border-b border-white/10 px-4 py-4">
          <h1 className="text-3xl font-bold text-center mb-3">Leden</h1>
          <input
            value={zoek}
            onChange={(e) => setZoek(e.target.value)}
            placeholder="Zoek op naam, email of les…"
            className="w-full rounded-lg bg-zinc-900 border border-zinc-700 p-3 text-white"
          />
        </div>

        {/* ===== CONTENT ===== */}
        <div className="p-4 space-y-5">
          {loading && <p className="text-gray-400">Laden…</p>}

          {groepen.map(([les, lijst], i) => {
            const kleur = rainbow[i % rainbow.length];
            const c = countSoorten(lijst);

            return (
              <div
                key={les}
                className={`rounded-xl border bg-gradient-to-br ${kleur}`}
              >
                <div className="px-4 py-3 border-b border-white/10">
                  <div className="font-semibold text-lg">{les}</div>
                  <div className="text-sm text-gray-300">
                    {c.totaal} leden • {c.abonnement} abonnement •{" "}
                    {c.rittenkaart} rittenkaart
                  </div>
                </div>

                {/* ===== SCROLLBARE LIJST ===== */}
                <ul className="max-h-[400px] overflow-y-auto">
                  {lijst.map((l) => {
                    const actief = l.id === geselecteerd;
                    return (
                      <li key={lidKey(l)}>
                        <button
                          onClick={() => setGeselecteerd(l.id)}
                          className={`w-full text-left px-4 py-3 border-b border-white/5 transition ${
                            actief
                              ? "bg-white/15"
                              : "hover:bg-white/5"
                          }`}
                        >
                          <div className="font-medium">{l.naam}</div>
                          <div className="text-xs text-gray-300">
                            {soortLabel(l.soort)}
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </div>
      </main>
    </AuthGuard>
  );
}
