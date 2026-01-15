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
};

/* ================= HULPFUNCTIES ================= */

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
  // Verwacht formaat: DD-MM-YYYY
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

  // Instellingen voor de prijzen per maand
  const PRIJS_ONDER_18 = 35;
  const PRIJS_18_TOT_21 = 37.50;
  const PRIJS_BOVEN_21 = 40;

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);

        // 1. Leden ophalen
        const resLeden = await fetch("/api/leden", { cache: "no-store" });
        const textLeden = await resLeden.text();
        const [, ...rowsLeden] = textLeden.trim().split("\n");
        const ledenData = rowsLeden.map(l => {
          const c = parseCsvLine(l);
          return { id: c[0], naam: c[1], les: c[3], les2: c[4], soort: c[5], geboortedatum: c[9] };
        });
        setLeden(ledenData);

        // 2. Kosten ophalen (uit de nieuwe sheet tab)
        const resKosten = await fetch("/api/lessen", { cache: "no-store" });
        const textKosten = await resKosten.text();
        const [, ...rowsKosten] = textKosten.trim().split("\n");
        const kostenData = rowsKosten.map(l => {
          const c = parseCsvLine(l);
          return {
            lesnaam: c[0] || "",
            uurtarief: parseFloat(c[1]) || 0,
            zaalhuur: parseFloat(c[2]) || 0,
          };
        });
        setKostenLijst(kostenData);

      } catch (err) {
        console.error("Fout bij laden data:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Unieke lijst van alle lessen die in de ledenlijst voorkomen
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
          <p className="text-center text-gray-400 text-xs mt-1">Berekening per maand (4 lessen)</p>
        </div>

        <div className="p-4 max-w-2xl mx-auto space-y-4">
          {loading ? (
            <p className="text-center text-gray-500 mt-10 italic">Gegevens uit Google Sheets ophalen...</p>
          ) : (
            alleLessen.map(les => {
              // 1. Filter leden die deze les volgen (les 1 of les 2) en een abonnement hebben
              const ledenInLes = leden.filter(l => 
                (norm(l.les) === norm(les) || norm(l.les2) === norm(les)) && 
                l.soort.toLowerCase().includes("abon")
              );

              // 2. Zoek de kosten op voor deze specifieke les
              const kosten = kostenLijst.find(k => norm(k.lesnaam) === norm(les));
              
              // 3. Bereken inkomsten op basis van leeftijd
              let inkomsten = 0;
              let cat1 = 0; // <18
              let cat2 = 0; // 18-21
              let cat3 = 0; // 21+

              ledenInLes.forEach(l => {
                const leeftijd = berekenLeeftijd(l.geboortedatum);
                if (leeftijd < 18) { inkomsten += PRIJS_ONDER_18; cat1++; }
                else if (leeftijd < 21) { inkomsten += PRIJS_18_TOT_21; cat2++; }
                else { inkomsten += PRIJS_BOVEN_21; cat3++; }
              });

              // 4. Bereken maandelijkse kosten (4x per maand)
              const maandDocent = (kosten?.uurtarief || 0) * 4;
              const maandZaal = (kosten?.zaalhuur || 0) * 4;
              const totaleKosten = maandDocent + maandZaal;
              const winst = inkomsten - totaleKosten;

              return (
                <div key={les} className="bg-zinc-900 rounded-2xl border border-white/10 overflow-hidden shadow-xl">
                  {/* Header van de les-kaart */}
                  <div className="p-4 bg-white/5 border-b border-white/10 flex justify-between items-center">
                    <h2 className="font-bold text-lg text-white">{les}</h2>
                    <div className={`px-3 py-1 rounded-full text-sm font-mono font-bold ${winst >= 0 ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                      {winst >= 0 ? '+' : ''}€{winst.toFixed(2)}
                    </div>
                  </div>

                  {/* Details sectie */}
                  <div className="p-4 grid grid-cols-2 gap-6">
                    {/* Linkerkant: Inkomsten */}
                    <div className="space-y-1">
                      <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Inkomsten ({ledenInLes.length}L)</p>
                      <p className="text-xl font-bold text-blue-400">€{inkomsten.toFixed(2)}</p>
                      <div className="text-[10px] text-gray-400 flex flex-wrap gap-x-2">
                        <span>{cat1}x &lt;18</span>
                        <span>{cat2}x 18-21</span>
                        <span>{cat3}x 21+</span>
                      </div>
                    </div>

                    {/* Rechterkant: Kosten */}
                    <div className="space-y-1">
                      <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Kosten (Maand)</p>
                      <p className="text-xl font-bold text-orange-400">€{totaleKosten.toFixed(2)}</p>
                      <div className="text-[10px] text-gray-400">
                        <span>Docent: €{maandDocent}</span>
                        <span className="mx-1">|</span>
                        <span>Zaal: €{maandZaal}</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Waarschuwing als er geen kosten zijn ingevuld in de sheet */}
                  {!kosten && (
                    <div className="bg-amber-500/10 p-2 text-[10px] text-amber-500 text-center border-t border-amber-500/20">
                      Geen kosten gevonden in sheet voor deze lesnaam.
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
