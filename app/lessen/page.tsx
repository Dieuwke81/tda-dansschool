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

type LesKosten = {
  lesnaam: string;
  uurtarief: number;
  zaalhuur: number;
  btwOnder18: number;
  btw18tot21: number;
  btw21plus: number;
};

/* ================= HULPFUNCTIES ================= */

// Verandert een string met komma (18,40) naar een getal dat de computer snapt (18.40)
function toNum(val: string): number {
  if (!val) return 0;
  const cleaned = val.replace(",", ".");
  return parseFloat(cleaned) || 0;
}

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
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
  const [kostenLijst, setKostenLijst] = useState<LesKosten[]>([]);
  const [loading, setLoading] = useState(true);

  const PRIJS_ONDER_18 = 35;
  const PRIJS_18_TOT_21 = 37.50;
  const PRIJS_BOVEN_21 = 40;

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
        setKostenLijst(rowsKosten.map(l => {
          const c = parseCsvLine(l);
          return {
            lesnaam: c[0] || "",
            uurtarief: toNum(c[1]),
            zaalhuur: toNum(c[2]),
            btwOnder18: toNum(c[3]),
            btw18tot21: toNum(c[4]),
            btw21plus: toNum(c[5]),
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

  return (
    <AuthGuard allowedRoles={["eigenaar", "docent"]}>
      <main className="min-h-screen bg-black text-white pb-10">
        <div className="sticky top-0 z-30 bg-black/90 backdrop-blur border-b border-white/10 px-4 py-6">
          <h1 className="text-3xl font-bold text-center text-pink-500">Financieel Overzicht</h1>
          <p className="text-center text-gray-400 text-xs mt-1">Berekening per maand (4 lessen) • BTW verrekend</p>
        </div>

        <div className="p-4 max-w-2xl mx-auto space-y-4">
          {loading ? (
            <p className="text-center text-gray-500 mt-10 italic">Data ophalen...</p>
          ) : (
            alleLessen.map(les => {
              const ledenInLes = leden.filter(l => 
                (norm(l.les) === norm(les) || norm(l.les2) === norm(les)) && 
                l.soort.toLowerCase().includes("abon")
              );

              const k = kostenLijst.find(item => norm(item.lesnaam) === norm(les));
              
              let brutoInkomsten = 0;
              let totaalBtw = 0;
              let cat1 = 0, cat2 = 0, cat3 = 0;

              ledenInLes.forEach(l => {
                const leeftijd = berekenLeeftijd(l.geboortedatum);
                let prijs = 0;
                let btwPerc = 0;

                if (leeftijd < 18) { 
                  prijs = PRIJS_ONDER_18; 
                  btwPerc = k?.btwOnder18 ?? 0; 
                  cat1++; 
                } else if (leeftijd < 21) { 
                  prijs = PRIJS_18_TOT_21; 
                  btwPerc = k?.btw18tot21 ?? 0; 
                  cat2++; 
                } else { 
                  prijs = PRIJS_BOVEN_21; 
                  btwPerc = k?.btw21plus ?? 0; 
                  cat3++; 
                }

                brutoInkomsten += prijs;
                // BTW berekening: Prijs is incl. BTW. Formule: Prijs - (Prijs / (1 + (percentage/100)))
                const btwBedrag = prijs - (prijs / (1 + (btwPerc / 100)));
                totaalBtw += btwBedrag;
              });

              const nettoInkomsten = brutoInkomsten - totaalBtw;
              const maandDocent = (k?.uurtarief || 0) * 4;
              const maandZaal = (k?.zaalhuur || 0) * 4;
              const totaleKosten = maandDocent + maandZaal;
              const winst = nettoInkomsten - totaleKosten;

              return (
                <div key={les} className="bg-zinc-900 rounded-2xl border border-white/10 overflow-hidden shadow-xl">
                  <div className="p-4 bg-white/5 border-b border-white/10 flex justify-between items-center">
                    <h2 className="font-bold text-lg text-white">{les}</h2>
                    <div className={`px-3 py-1 rounded-full text-sm font-mono font-bold ${winst >= 0 ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                      {winst >= 0 ? '+' : ''}€{winst.toFixed(2)}
                    </div>
                  </div>

                  <div className="p-4 grid grid-cols-2 gap-6">
                    <div className="space-y-1">
                      <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Netto Omzet (ex. BTW)</p>
                      <p className="text-xl font-bold text-blue-400">€{nettoInkomsten.toFixed(2)}</p>
                      <p className="text-[10px] text-gray-400 italic">Bruto: €{brutoInkomsten.toFixed(2)} | BTW: €{totaalBtw.toFixed(2)}</p>
                    </div>

                    <div className="space-y-1 text-right sm:text-left">
                      <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Kosten (Maand)</p>
                      <p className="text-xl font-bold text-orange-400">€{totaleKosten.toFixed(2)}</p>
                      <div className="text-[10px] text-gray-400">
                        <span>Docent: €{maandDocent.toFixed(2)}</span>
                        <span className="mx-1">|</span>
                        <span>Zaal: €{maandZaal.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="px-4 pb-4 flex gap-4">
                     <div className="text-[10px] text-zinc-500">Leden: {cat1}x &lt;18 | {cat2}x 18-21 | {cat3}x 21+</div>
                  </div>
                  
                  {!k && (
                    <div className="bg-amber-500/10 p-2 text-[10px] text-amber-500 text-center border-t border-amber-500/20 italic">
                      Geen kosten/BTW data gevonden in sheet voor deze lesnaam.
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </main>
    </AuthGuard>
  );
}
