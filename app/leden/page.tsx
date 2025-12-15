
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
      } else inQuotes = !inQuotes;
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
  if (!x) return "-";
  if (x.includes("rit")) return "Rittenkaart";
  if (x.includes("abon")) return "Abonnement";
  return clean(raw);
}

function soortType(raw: unknown) {
  const x = norm(raw);
  if (x.includes("rit")) return "rittenkaart";
  if (x.includes("abon")) return "abonnement";
  return "overig";
}

function countSoorten(lijst: Lid[]) {
  let abonnement = 0,
    rittenkaart = 0;
  for (const l of lijst) {
    const t = soortType(l.soort);
    if (t === "abonnement") abonnement++;
    else if (t === "rittenkaart") rittenkaart++;
  }
  return { abonnement, rittenkaart, totaal: lijst.length };
}

/* ================= GROEPERING ================= */

function sortAndUniqGroups(groups: Map<string, Lid[]>) {
  return Array.from(groups.entries())
    .map(([les, lijst]) => {
      const seen = new Set<string>();
      const uniek = lijst.filter((l) => {
        const k = lidKey(l);
        if (!k || seen.has(k)) return false;
        seen.add(k);
        return true;
      });
      uniek.sort((a, b) => clean(a.naam).localeCompare(clean(b.naam), "nl"));
      return [les, uniek] as const;
    })
    .sort((a, b) => a[0].localeCompare(b[0], "nl"));
}

function groupByLesBoth(leden: Lid[]) {
  const groups = new Map<string, Lid[]>();
  for (const l of leden) {
    if (l.les) (groups.get(l.les) ?? groups.set(l.les, []).get(l.les)!).push(l);
    if (l.les2) (groups.get(l.les2) ?? groups.set(l.les2, []).get(l.les2)!).push(l);
  }
  return sortAndUniqGroups(groups);
}

/* ================= REGENBOOG PALET ================= */

const rainbow = [
  { bg: "bg-rose-500/8", border: "border-rose-400/60", text: "text-rose-300", ring: "ring-rose-400/40", glow: "shadow-[0_0_30px_rgba(244,63,94,0.28)]" },
  { bg: "bg-orange-500/8", border: "border-orange-400/60", text: "text-orange-300", ring: "ring-orange-400/40", glow: "shadow-[0_0_30px_rgba(249,115,22,0.28)]" },
  { bg: "bg-amber-500/8", border: "border-amber-400/60", text: "text-amber-300", ring: "ring-amber-400/40", glow: "shadow-[0_0_30px_rgba(245,158,11,0.26)]" },
  { bg: "bg-lime-500/8", border: "border-lime-400/60", text: "text-lime-300", ring: "ring-lime-400/40", glow: "shadow-[0_0_30px_rgba(163,230,53,0.24)]" },
  { bg: "bg-emerald-500/8", border: "border-emerald-400/60", text: "text-emerald-300", ring: "ring-emerald-400/40", glow: "shadow-[0_0_30px_rgba(16,185,129,0.24)]" },
  { bg: "bg-sky-500/8", border: "border-sky-400/60", text: "text-sky-300", ring: "ring-sky-400/40", glow: "shadow-[0_0_30px_rgba(14,165,233,0.24)]" },
  { bg: "bg-indigo-500/8", border: "border-indigo-400/60", text: "text-indigo-300", ring: "ring-indigo-400/40", glow: "shadow-[0_0_30px_rgba(99,102,241,0.24)]" },
  { bg: "bg-violet-500/8", border: "border-violet-400/60", text: "text-violet-300", ring: "ring-violet-400/40", glow: "shadow-[0_0_30px_rgba(139,92,246,0.24)]" },
];

/* ================= PAGINA ================= */

export default function LedenPage() {
  const [leden, setLeden] = useState<Lid[]>([]);
  const [rol, setRol] = useState<Rol>("docent");
  const [activeLes, setActiveLes] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/session")
      .then((r) => r.json())
      .then((d: SessionResponse) => d?.rol && setRol(d.rol));
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
      });
  }, []);

  const groepen = useMemo(() => groupByLesBoth(leden), [leden]);

  return (
    <AuthGuard allowedRoles={["eigenaar", "docent"]}>
      <main className="min-h-screen bg-black text-white p-6">
        <h1 className="text-2xl font-bold text-pink-500 mb-6">Leden</h1>

        <div className="space-y-4">
          {groepen.map(([les, lijst], i) => {
            const p = rainbow[i % rainbow.length];
            const c = countSoorten(lijst);
            const active = activeLes === les;

            return (
              <div
                key={les}
                onClick={() => setActiveLes(les)}
                className={[
                  "rounded-2xl border transition-all cursor-pointer",
                  p.bg,
                  p.border,
                  active
                    ? `ring-1 ${p.ring} ${p.glow} brightness-[1.08]`
                    : "hover:brightness-[1.04]",
                ].join(" ")}
              >
                <div className="px-4 py-3 border-b border-white/10">
                  <div className={`font-semibold ${p.text}`}>{les}</div>
                  <div className="text-sm text-gray-300 mt-1">
                    {c.totaal} leden • {c.abonnement} abonnement • {c.rittenkaart} rittenkaart
                  </div>
                </div>

                <ul>
                  {lijst.map((l) => (
                    <li key={lidKey(l)} className="px-4 py-3 border-t border-white/5">
                      <div className="font-medium">{l.naam}</div>
                      <div className="text-xs text-gray-400">{soortLabel(l.soort)}</div>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </main>
    </AuthGuard>
  );
}
