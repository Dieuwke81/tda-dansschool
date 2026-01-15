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

/* ================= HULPFUNCTIES ================= */

// Maakt een nummer klaar voor WhatsApp (verwijdert spaties, +31 toevoegen indien nodig)
function formatWhatsApp(tel: string): string {
  let cleaned = tel.replace(/\D/g, ""); // Alleen cijfers overhouden
  if (cleaned.startsWith("0")) {
    cleaned = "31" + cleaned.substring(1); // 06 veranderen naar 316
  }
  return `https://wa.me/${cleaned}`;
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
  { bg: "from-red-500/10 to-red-500/5", border: "border-red-400/50", text: "text-red-300" },
  { bg: "from-orange-500/10 to-orange-500/5", border: "border-orange-400/50", text: "text-orange-300" },
  { bg: "from-yellow-500/10 to-yellow-500/5", border: "border-yellow-400/50", text: "text-yellow-300" },
  { bg: "from-green-500/10 to-green-500/5", border: "border-green-400/50", text: "text-green-300" },
  { bg: "from-cyan-500/10 to-cyan-500/5", border: "border-cyan-400/50", text: "text-cyan-300" },
  { bg: "from-blue-500/10 to-blue-500/5", border: "border-blue-400/50", text: "text-blue-300" },
  { bg: "from-purple-500/10 to-purple-500/5", border: "border-purple-400/50", text: "text-purple-300" },
];

/* ================= PAGINA ================= */

export default function LedenPage() {
  const [leden, setLeden] = useState<Lid[]>([]);
  const [zoek, setZoek] = useState("");
  const [loading, setLoading] = useState(true);
  const [geselecteerd, setGeselecteerd] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
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
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
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

  const geselecteerdLid = useMemo(() => {
    return leden.find(l => l.id === geselecteerd) || null;
  }, [leden, geselecteerd]);

  return (
    <AuthGuard allowedRoles={["eigenaar", "docent"]}>
      {/* ANIMATIE STYLES */}
      <style jsx global>{`
        @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        .animate-slide-up { animation: slideUp 0.35s ease-out forwards; }
        .animate-fade-in { animation: fadeIn 0.3s ease-out forwards; }
      `}</style>

      <main className="min-h-screen bg-black text-white">
        {/* STICKY HEADER */}
        <div className="sticky top-0 z-30 bg-black/90 backdrop-blur border-b border-white/10 px-4 py-4">
          <h1 className="text-3xl font-bold text-center mb-3 text-pink-500">Leden</h1>
          <input
            value={zoek}
            onChange={(e) => setZoek(e.target.value)}
            placeholder="Zoek op naam, email of les…"
            className="w-full rounded-lg bg-zinc-900 border border-zinc-700 p-3 text-white"
          />
        </div>

        {/* CONTENT */}
        <div className="p-4 space-y-5 pb-20">
          {loading && <p className="text-gray-400 text-center">Laden…</p>}

          {groepen.map(([les, lijst], i) => {
            const kleur = rainbow[i % rainbow.length];
            const c = countSoorten(lijst);
            return (
              <div key={les} className={`rounded-xl border ${kleur.border} bg-gradient-to-br ${kleur.bg}`}>
                <div className="px-4 py-3 border-b border-white/10">
                  <div className={`font-semibold text-lg ${kleur.text}`}>{les}</div>
                  <div className="text-sm text-gray-300">{c.totaal} leden • {c.abonnement} abon.</div>
                </div>
                <ul className="max-h-[400px] overflow-y-auto">
                  {lijst.map((l) => (
                    <li key={lidKey(l)}>
                      <button
                        onClick={() => setGeselecteerd(l.id)}
                        className={`w-full text-left px-4 py-3 border-b border-white/5 transition ${l.id === geselecteerd ? "bg-white/20" : "hover:bg-white/5"}`}
                      >
                        <div className="font-medium text-white">{l.naam}</div>
                        <div className="text-xs text-gray-400">{soortLabel(l.soort)}</div>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>

        {/* DETAIL VENSTER (MODAL) */}
        {geselecteerdLid && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
            <div className="absolute inset-0" onClick={() => setGeselecteerd(null)} />
            <div className="relative w-full max-w-lg bg-zinc-900 border-t border-white/20 rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden animate-slide-up">
              <div className="w-12 h-1.5 bg-white/20 rounded-full mx-auto mt-3 mb-1 sm:hidden" />
              <div className="p-6">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h2 className="text-2xl font-bold text-pink-500">{geselecteerdLid.naam}</h2>
                    <p className="text-zinc-400 text-sm">{soortLabel(geselecteerdLid.soort)}</p>
                  </div>
                  <button onClick={() => setGeselecteerd(null)} className="bg-white/10 text-white w-10 h-10 rounded-full flex items-center justify-center hover:bg-white/20 transition">✕</button>
                </div>
                
                <div className="space-y-4">
                  {/* CONTACT SECTIE MET WHATSAPP */}
                  <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                    <span className="text-zinc-500 block text-[10px] uppercase font-bold tracking-wider mb-2">Contactgegevens</span>
                    <a href={`mailto:${geselecteerdLid.email}`} className="text-pink-400 block mb-4 break-all underline font-medium">{geselecteerdLid.email}</a>
                    
                    <div className="space-y-3">
                      {/* Telefoon 1 */}
                      <div className="flex items-center justify-between bg-black/30 p-2 rounded-lg">
                        <span className="text-zinc-300 text-sm">{geselecteerdLid.tel1}</span>
                        <div className="flex gap-2">
                          <a href={`tel:${geselecteerdLid.tel1}`} className="bg-blue-500/20 text-blue-400 p-2 rounded-lg text-xs font-bold">📞 Bellen</a>
                          <a href={formatWhatsApp(geselecteerdLid.tel1)} target="_blank" className="bg-green-500/20 text-green-400 p-2 rounded-lg text-xs font-bold">💬 WhatsApp</a>
                        </div>
                      </div>
                      {/* Telefoon 2 (indien aanwezig) */}
                      {geselecteerdLid.tel2 && (
                        <div className="flex items-center justify-between bg-black/30 p-2 rounded-lg">
                          <span className="text-zinc-300 text-sm">{geselecteerdLid.tel2}</span>
                          <div className="flex gap-2">
                            <a href={`tel:${geselecteerdLid.tel2}`} className="bg-blue-500/20 text-blue-400 p-2 rounded-lg text-xs font-bold">📞 Bellen</a>
                            <a href={formatWhatsApp(geselecteerdLid.tel2)} target="_blank" className="bg-green-500/20 text-green-400 p-2 rounded-lg text-xs font-bold">💬 WhatsApp</a>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                    <span className="text-zinc-500 block text-[10px] uppercase font-bold tracking-wider mb-2">Adres</span>
                    <p className="text-zinc-200">{geselecteerdLid.adres}</p>
                    <p className="text-zinc-200">{geselecteerdLid.postcode} {geselecteerdLid.plaats}</p>
                    <p className="text-zinc-400 mt-2 text-sm">🎂 {geselecteerdLid.geboortedatum}</p>
                  </div>
                </div>
                <button onClick={() => setGeselecteerd(null)} className="w-full py-4 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl font-bold mt-6 transition">Sluiten</button>
              </div>
            </div>
          </div>
        )}
      </main>
    </AuthGuard>
  );
}
