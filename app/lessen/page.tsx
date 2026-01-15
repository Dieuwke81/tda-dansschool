"use client";

import { useEffect, useMemo, useState } from "react";
import AuthGuard from "../auth-guard";

/* ================= TYPES ================= */

type Lid = {
  id: string;
  naam: string;
  les: string;
  les2: string;
  soort: string;
  geboortedatum: string;
};

type LesConfig = {
  lesnaam: string;
  uurtarief: number;
  zaalhuur: number;
  btwOnder18: number;
  btw18tot21: number;
  btw21plus: number;
  prijsOnder18: number;
  prijs18tot21: number;
  prijs21plus: number;
  prijsRittenkaart: number;
};

/* ================= HULPFUNCTIES ================= */

function toNum(val: string): number {
  if (!val) return 0;
  const cleaned = val.replace(/[^0-9,.-]/g, "").replace(",", ".");
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let inQuotes = false;
  let cur = "";
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { cur += '"'; i++; } 
      else { inQuotes = !inQuotes; }
      continue;
    }
    if (ch === "," && !inQuotes) { out.push(cur.trim()); cur = ""; continue; }
    cur += ch;
  }
  out.push(cur.trim());
  return out;
}

function berekenLeeftijd(geboortedatum: string): number {
  if (!geboortedatum) return 0;
  const parts = geboortedatum.split("-");
  if (parts.length !== 3) return 0;
  const birthDate = new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
  return age;
}

const norm = (s: string) => s.toLowerCase().trim();

/* ================= PAGINA ================= */

export default function LessenPage() {
  const [leden, setLeden] = useState<Lid[]>([]);
  const [configs, setConfigs] = useState<LesConfig[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const resLeden = await fetch("/api/leden", { cache: "no-store" });
        const textLeden = await resLeden.text();
        const [, ...rowsLeden] = textLeden.trim().split("\n");
        setLeden(rowsLeden.map(l => {
          const c = parseCsvLine(l);
          return { id: c[0], naam: c[1], les: c[3], les2: c[4], soort: c[5], geboortedatum: c[9] };
        }));

        const resKosten = await fetch("/api/lessen", { cache: "no-store" });
        const textKosten = await resKosten.text();
        const [, ...rowsKosten] = textKosten.trim().split("\n");
        setConfigs(rowsKosten.map(l => {
          const c = parseCsvLine(l);
          return {
            lesnaam: c[0] || "",
            uurtarief: toNum(c[1]),
            zaalhuur: toNum(c[2]),
            btwOnder18: toNum(c[3]),
            btw18tot21: toNum(c[4]),
            btw21plus: toNum(c[5]),
            prijsOnder18: toNum(c[6]),
            prijs18tot21: toNum(c[7]),
            prijs21plus: toNum(c[8]),
            prijsRittenkaart: toNum(c[9]),
          };
        }));
      } catch (err) { console.error(err); } finally { setLoading(false); }
    }
    loadData();
  }, []);

  const alleLessen = useMemo(() => {
    const set = new Set<string>();
    leden.forEach(l => {
      if (l.les) set.add(l.les.trim());
      if (l.les2) set.add(l.les2.trim());
    });
    return Array.from(set).sort();
  }, [leden]);

  // Bereken totalen
  const totalen = useMemo(() => {
    let nettoOmzet = 0;
    let kosten = 0;
    alleLessen.forEach(les => {
      const cfg = configs.find(item => norm(item.lesnaam) === norm(les));
      const ledenInLes = leden.filter(l => (norm(l.les) === norm(les) || norm(l.les2) === norm(les)));

      ledenInLes.forEach(l => {
        let prijs = 0; let btwPerc = 0;
        if (l.soort.toLowerCase().includes("rit")) {
          prijs = (cfg?.prijsRittenkaart ?? 0) / 6;
          btwPerc = cfg?.btw21plus ?? 0;
        } else if (l.soort.toLowerCase().includes("abon")) {
          const age = berekenLeeftijd(l.geboortedatum);
          if (age < 18) { prijs = cfg?.prijsOnder18 ?? 0; btwPerc = cfg?.btwOnder18 ?? 0; }
          else if (age < 21) { prijs = cfg?.prijs18tot21 ?? 0; btwPerc = cfg?.btw18tot21 ?? 0; }
          else { prijs = cfg?.prijs21plus ?? 0; btwPerc = cfg?.btw21plus ?? 0; }
        }
        nettoOmzet += prijs / (1 + (btwPerc / 100));
      });
      kosten += ((cfg?.uurtarief || 0) * 4) + ((cfg?.zaalhuur || 0) * 4);
    });
    return { netto: nettoOmzet, kosten: kosten, winst: nettoOmzet - kosten };
  }, [leden, alleLessen, configs]);

  return (
    <AuthGuard allowedRoles={["eigenaar", "docent"]}>
      <main className="min-h-screen bg-black text-white pb-24">
        <div className="sticky top-0 z-30 bg-black/90 backdrop-blur border-b border-white/10 px-4 py-6 text-center">
          <h1 className="text-3xl font-bold text-pink-500">Financieel Overzicht</h1>
          <p className="text-gray-400 text-[10px] uppercase tracking-widest mt-1">
            Spreiding Rittenkaarten (6 mnd) verwerkt
          </p>
        </div>

        <div className="p-4 max-w-2xl mx-auto space-y-5">
          {loading ? (
            <p className="text-center text-zinc-500 mt-10 animate-pulse">Laden...</p>
          ) : (
            <>
              {/* TOTAAL OVERZICHT */}
              <div className="bg-pink-600 rounded-3xl p-6 shadow-2xl border border-pink-400/30">
                <p className="text-white/70 text-[10px] uppercase font-black tracking-widest mb-1">Totaal Rendement (Maand)</p>
                <h2 className="text-4xl font-black text-white">€{totalen.winst.toFixed(2)}</h2>
                <div className="mt-4 pt-4 border-t border-white/20 flex justify-between text-xs font-bold text-white/80">
                  <span>Netto Omzet: €{totalen.netto.toFixed(2)}</span>
                  <span>Kosten: €{totalen.kosten.toFixed(2)}</span>
                </div>
              </div>

              {/* PER LES */}
              {alleLessen.map(les => {
                const ledenInLes = leden.filter(l => norm(l.les) === norm(les) || norm(l.les2) === norm(les));
                const cfg = configs.find(item => norm(item.lesnaam) === norm(les));
                
                let nettoAbon = 0; let nettoRit = 0;
                let countAbon = 0; let countRit = 0;

                ledenInLes.forEach(l => {
                  if (l.soort.toLowerCase().includes("rit")) {
                    const prijs = (cfg?.prijsRittenkaart ?? 0) / 6;
                    nettoRit += prijs / (1 + ((cfg?.btw21plus ?? 0) / 100));
                    countRit++;
                  } else if (l.soort.toLowerCase().includes("abon")) {
                    const age = berekenLeeftijd(l.geboortedatum);
                    let p = 0; let b = 0;
                    if (age < 18) { p = cfg?.prijsOnder18 ?? 0; b = cfg?.btwOnder18 ?? 0; }
                    else if (age < 21) { p = cfg?.prijs18tot21 ?? 0; b = cfg?.btw18tot21 ?? 0; }
                    else { p = cfg?.prijs21plus ?? 0; b = cfg?.btw21plus ?? 0; }
                    nettoAbon += p / (1 + (b / 100));
                    countAbon++;
                  }
                });

                const totaleKosten = ((cfg?.uurtarief || 0) * 4) + ((cfg?.zaalhuur || 0) * 4);
                const winst = (nettoAbon + nettoRit) - totaleKosten;

                return (
                  <div key={les} className="bg-zinc-900 rounded-3xl border border-white/5 overflow-hidden shadow-lg">
                    <div className="p-5 bg-white/5 border-b border-white/5 flex justify-between items-center">
                      <h2 className="font-extrabold text-base text-white">{les}</h2>
                      <div className={`px-4 py-1.5 rounded-full text-sm font-mono font-bold ${winst >= 0 ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                        €{winst.toFixed(2)}
                      </div>
                    </div>

                    <div className="p-5 space-y-4">
                      <div className="flex justify-between items-end">
                        <div>
                          <p className="text-[10px] text-zinc-500 uppercase font-black tracking-widest">Netto Omzet</p>
                          <p className="text-2xl font-bold text-blue-400">€{(nettoAbon + nettoRit).toFixed(2)}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] text-zinc-500 uppercase font-black tracking-widest">Maandkosten</p>
                          <p className="text-2xl font-bold text-orange-400">€{totaleKosten.toFixed(2)}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 pt-3 border-t border-white/5">
                        <div className="text-[10px] text-zinc-400">
                          <span className="block font-bold text-zinc-200">Abonnementen ({countAbon})</span>
                          €{nettoAbon.toFixed(2)} netto
                        </div>
                        <div className="text-[10px] text-zinc-400 text-right">
                          <span className="block font-bold text-zinc-200">Rittenkaarten ({countRit})</span>
                          €{nettoRit.toFixed(2)} netto (1/6e deel)
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </div>
      </main>
    </AuthGuard>
  );
}
