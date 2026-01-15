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
};

/* ================= HULPFUNCTIES ================= */

function toNum(val: string): number {
  if (!val) return 0;
  // Verwijdert €, spaties en zet komma om naar punt
  const cleaned = val.replace(/[^0-9,.-]/g, "").replace(",", ".");
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
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
  const [configs, setConfigs] = useState<LesConfig[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        // 1. Leden ophalen
        const resLeden = await fetch("/api/leden", { cache: "no-store" });
        const textLeden = await resLeden.text();
        const [, ...rowsLeden] = textLeden.trim().split("\n");
        setLeden(rowsLeden.map(l => {
          const c = parseCsvLine(l);
          return { id: c[0], naam: c[1], les: c[3], les2: c[4], soort: c[5], geboortedatum: c[9] };
        }));

        // 2. Les configuratie (Kosten, BTW en Prijzen) ophalen
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
          };
        }));
      } catch (err) { 
        console.error("Fout bij laden data:", err); 
      } finally { 
        setLoading(false); 
      }
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
        <div className="sticky top-0 z-30 bg-black/90 backdrop-blur border-b border-white/10 px-4 py-6 text-center">
          <h1 className="text-3xl font-bold text-pink-500 tracking-tight">Financieel Overzicht</h1>
          <p className="text-gray-400 text-[10px] uppercase tracking-widest mt-1">
            Maandberekening (4 lessen) • Alle data uit Google Sheets
          </p>
        </div>

        <div className="p-4 max-w-2xl mx-auto space-y-5">
          {loading ? (
            <p className="text-center text-zinc-500 mt-10 animate-pulse">Sheet gegevens inladen...</p>
          ) : (
            alleLessen.map(les => {
              const ledenInLes = leden.filter(l => 
                (norm(l.les) === norm(les) || norm(l.les2) === norm(les)) && 
                l.soort.toLowerCase().includes("abon")
              );

              const cfg = configs.find(item => norm(item.lesnaam) === norm(les));
              
              let brutoInkomsten = 0;
              let totaalBtw = 0;
              let cat1 = 0, cat2 = 0, cat3 = 0;

              ledenInLes.forEach(l => {
                const leeftijd = berekenLeeftijd(l.geboortedatum);
                let prijs = 0;
                let btwPerc = 0;

                if (leeftijd < 18) { 
                  prijs = cfg?.prijsOnder18 ?? 0; 
                  btwPerc = cfg?.btwOnder18 ?? 0; 
                  cat1++; 
                } else if (leeftijd < 21) { 
                  prijs = cfg?.prijs18tot21 ?? 0; 
                  btwPerc = cfg?.btw18tot21 ?? 0; 
                  cat2++; 
                } else { 
                  prijs = cfg?.prijs21plus ?? 0; 
                  btwPerc = cfg?.btw21plus ?? 0; 
                  cat3++; 
                }

                brutoInkomsten += prijs;
                const btwBedrag = prijs - (prijs / (1 + (btwPerc / 100)));
                totaalBtw += btwBedrag;
              });

              const nettoInkomsten = brutoInkomsten - totaalBtw;
              const maandDocent = (cfg?.uurtarief || 0) * 4;
              const maandZaal = (cfg?.zaalhuur || 0) * 4;
              const totaleKosten = maandDocent + maandZaal;
              const winst = nettoInkomsten - totaleKosten;

              return (
                <div key={les} className="bg-zinc-900 rounded-3xl border border-white/5 overflow-hidden shadow-2xl transition-transform active:scale-[0.99]">
                  {/* Header */}
                  <div className="p-5 bg-gradient-to-r from-white/5 to-transparent border-b border-white/5 flex justify-between items-center">
                    <h2 className="font-extrabold text-lg text-white leading-tight pr-2">{les}</h2>
                    <div className={`px-4 py-1.5 rounded-full text-sm font-mono font-bold shadow-inner ${winst >= 0 ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                      {winst >= 0 ? '+' : ''}€{winst.toFixed(2)}
                    </div>
                  </div>

                  {/* Cijfers */}
                  <div className="p-5 grid grid-cols-2 gap-8">
                    <div className="space-y-1">
                      <p className="text-[10px] text-zinc-500 uppercase font-black tracking-widest">Netto Omzet</p>
                      <p className="text-2xl font-bold text-blue-400 tracking-tighter">€{nettoInkomsten.toFixed(2)}</p>
                      <p className="text-[10px] text-zinc-600 font-medium italic">Bruto: €{brutoInkomsten.toFixed(2)}</p>
                    </div>

                    <div className="space-y-1 text-right">
                      <p className="text-[10px] text-zinc-500 uppercase font-black tracking-widest">Kosten</p>
                      <p className="text-2xl font-bold text-orange-400 tracking-tighter">€{totaleKosten.toFixed(2)}</p>
                      <p className="text-[10px] text-zinc-600 font-medium italic">D: €{maandDocent.toFixed(0)} | Z: €{maandZaal.toFixed(0)}</p>
                    </div>
                  </div>

                  {/* Footer / Leden info */}
                  <div className="px-5 py-3 bg-black/20 flex justify-between items-center">
                     <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-tighter">
                       👥 {cat1}x &lt;18 · {cat2}x 18-21 · {cat3}x 21+
                     </div>
                     {(!cfg || (cfg.prijsOnder18 === 0 && cfg.prijs21plus === 0)) && (
                       <div className="text-[10px] text-amber-500 font-black animate-pulse uppercase">
                         ⚠️ Tarieven missen in sheet
                       </div>
                     )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </main>
    </AuthGuard>
  );
}
