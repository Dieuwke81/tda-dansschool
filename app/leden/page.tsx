
"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import AuthGuard from "../auth-guard";

type Rol = "eigenaar" | "docent" | "gast" | "lid";

type SessionResponse = {
  loggedIn?: boolean;
  rol?: Rol;
  username?: string;
  mustChangePassword?: boolean;
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

/* ---------- HULPFUNCTIES ---------- */

// ✅ CSV parser (werkt ook met komma’s in quotes)
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

function clean(s: unknown) {
  return String(s ?? "").trim();
}

function norm(s: unknown) {
  return clean(s)
    .replace(/\u00A0/g, " ")
    .replace(/\s+/g, " ")
    .toLowerCase();
}

function lidKey(l: Lid) {
  return clean(l.id) || clean(l.email) || clean(l.naam);
}

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

  // ga uit van NL-nummer
  if (digits.startsWith("0031")) {
    digits = "31" + digits.slice(4);
  } else if (digits.startsWith("0")) {
    digits = "31" + digits.slice(1);
  }

  return `https://wa.me/${digits}`;
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

function getDagMaand(raw: string): { dag: number; maand: number } | null {
  if (!raw) return null;
  const parts = raw.split(/[-/.]/);
  if (parts.length !== 3) return null;
  const d = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  if (!d || !m) return null;
  return { dag: d, maand: m };
}

/**
 * ✅ DOCENT:
 * /api/leden levert al alleen leden terug van de lessen van deze docent.
 * We zetten elk lid daarom in EXACT 1 groep:
 * - als les gevuld is -> die groep
 * - anders als les2 gevuld is -> die groep
 * (geen "les2 voorrang", maar gewoon "gebruik de les die er daadwerkelijk staat")
 */
function groupByLesSingle(leden: Lid[]) {
  const groups = new Map<string, Lid[]>();

  for (const lid of leden) {
    const les1 = clean(lid.les);
    const les2 = clean(lid.les2);

    const key = les1 || les2 || "Geen les";

    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(lid);
  }

  return sortAndUniqGroups(groups);
}

/**
 * ✅ EIGENAAR: lid mag in 2 groepen staan (les én les2)
 */
function groupByLesBoth(leden: Lid[]) {
  const groups = new Map<string, Lid[]>();

  function add(lesNaam: string, lid: Lid) {
    const key = clean(lesNaam);
    if (!key) return;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(lid);
  }

  for (const lid of leden) {
    add(lid.les, lid);
    add(lid.les2, lid);
  }

  return sortAndUniqGroups(groups);
}

function sortAndUniqGroups(groups: Map<string, Lid[]>) {
  const sorted = Array.from(groups.entries())
    .map(([lesNaam, lijst]) => {
      const seen = new Set<string>();
      const uniek = lijst.filter((l) => {
        const k = lidKey(l);
        if (!k) return false;
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      });

      uniek.sort((a, b) => clean(a.naam).localeCompare(clean(b.naam), "nl"));
      return [lesNaam, uniek] as const;
    })
    .sort((a, b) => a[0].localeCompare(b[0], "nl"));

  return sorted;
}

/* ---------------------------------- */

export default function LedenPage() {
  const [leden, setLeden] = useState<Lid[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [zoekTerm, setZoekTerm] = useState("");
  const [geselecteerdId, setGeselecteerdId] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);

  // ✅ rol ophalen om owner/docent weergave te kiezen
  const [rol, setRol] = useState<Rol>("docent");

  useEffect(() => {
    let cancelled = false;

    async function loadAll() {
      try {
        setLoading(true);
        setError(null);

        // 1) rol ophalen (mag falen, default blijft docent)
        try {
          const s = await fetch("/api/session", {
            cache: "no-store",
            credentials: "include",
          });
          const d = (await s.json().catch(() => null)) as SessionResponse | null;
          if (!cancelled && s.ok && d?.loggedIn && d?.rol) setRol(d.rol);
        } catch {
          // ignore
        }

        // 2) leden ophalen
        const res = await fetch("/api/leden", {
          cache: "no-store",
          credentials: "include",
        });
        if (!res.ok) throw new Error("Kon de ledenlijst niet ophalen");

        const text = await res.text();
        const lines = text.trim().split("\n");
        if (lines.length < 2) {
          if (!cancelled) setLeden([]);
          return;
        }

        const [, ...rows] = lines;

        const data: Lid[] = rows
          .filter((line) => line.trim().length > 0)
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
          });

        if (!cancelled) {
          setLeden(data);
          if (data.length > 0) setGeselecteerdId(data[0].id);
        }
      } catch (err: any) {
        if (!cancelled) setError(err.message ?? "Er ging iets mis");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadAll();
    return () => {
      cancelled = true;
    };
  }, []);

  const gefilterdeLeden = useMemo(() => {
    const zoek = norm(zoekTerm);
    if (!zoek) return leden;

    return leden.filter((lid) => {
      return (
        norm(lid.naam).includes(zoek) ||
        norm(lid.email).includes(zoek) ||
        norm(lid.les).includes(zoek) ||
        norm(lid.les2).includes(zoek)
      );
    });
  }, [leden, zoekTerm]);

  const groepen = useMemo(() => {
    return rol === "eigenaar"
      ? groupByLesBoth(gefilterdeLeden)
      : groupByLesSingle(gefilterdeLeden);
  }, [gefilterdeLeden, rol]);

  const geselecteerdLid =
    gefilterdeLeden.find((lid) => lid.id === geselecteerdId) ?? null;

  // Verjaardagen vandaag & morgen (op ALLE leden, niet op filter)
  const { jarigVandaag, jarigMorgen } = useMemo(() => {
    const vandaag = new Date();
    const morgen = new Date();
    morgen.setDate(vandaag.getDate() + 1);

    const dVandaag = vandaag.getDate();
    const mVandaag = vandaag.getMonth() + 1;
    const dMorgen = morgen.getDate();
    const mMorgen = morgen.getMonth() + 1;

    const vandaagNamen: string[] = [];
    const morgenNamen: string[] = [];

    leden.forEach((lid) => {
      const dm = getDagMaand(lid.geboortedatum);
      if (!dm) return;
      if (dm.dag === dVandaag && dm.maand === mVandaag) {
        vandaagNamen.push(lid.naam);
      } else if (dm.dag === dMorgen && dm.maand === mMorgen) {
        morgenNamen.push(lid.naam);
      }
    });

    return { jarigVandaag: vandaagNamen, jarigMorgen: morgenNamen };
  }, [leden]);

  const totaalUniek = useMemo(() => {
    const seen = new Set<string>();
    for (const l of gefilterdeLeden) {
      const k = lidKey(l);
      if (k) seen.add(k);
    }
    return seen.size;
  }, [gefilterdeLeden]);

  return (
    <AuthGuard allowedRoles={["eigenaar", "docent"]}>
      <main className="min-h-screen bg-black text-white p-4 md:p-6">
        <h1 className="text-2xl font-bold text-pink-500 mb-4">Leden</h1>

        {/* Zoekbalk */}
        <div className="mb-4">
          <input
            type="text"
            placeholder="Zoek op naam, email of les..."
            value={zoekTerm}
            onChange={(e) => setZoekTerm(e.target.value)}
            className="w-full rounded bg-zinc-900 border border-zinc-700 p-2 text-white"
          />
        </div>

        {loading && <p className="text-gray-400">Laden…</p>}
        {error && <p className="text-red-400">{error}</p>}

        {!loading && !error && totaalUniek === 0 && (
          <p className="text-gray-400">Geen leden gevonden.</p>
        )}

        {!loading && !error && totaalUniek > 0 && (
          <>
            <div className="text-sm text-gray-300 mb-3">
              {totaalUniek} leden (gegroepeerd per les)
            </div>

            <div className="space-y-4">
              {groepen.map(([lesNaam, lijst]) => (
                <div
                  key={lesNaam}
                  className="bg-zinc-900 border border-zinc-700 rounded-xl overflow-hidden"
                >
                  <div className="px-4 py-2 border-b border-zinc-700 flex items-center justify-between">
                    <div className="font-semibold">{lesNaam}</div>
                    <div className="text-sm text-gray-300">{lijst.length} leden</div>
                  </div>

                  <ul className="max-h-64 overflow-y-auto">
                    {lijst.map((lid) => {
                      const actief = lid.id === geselecteerdId;
                      return (
                        <li key={`${lesNaam}-${lidKey(lid)}`}>
                          <button
                            type="button"
                            onClick={() => {
                              setGeselecteerdId(lid.id);
                              setShowModal(true);
                            }}
                            className={`w-full text-left px-4 py-3 text-sm border-b border-zinc-800 hover:bg-zinc-800/80 transition-colors ${
                              actief ? "bg-pink-500/20" : ""
                            }`}
                          >
                            <div className="font-semibold">{lid.naam}</div>
                            <div className="text-xs text-gray-400 truncate">
                              {clean(lid.les) || clean(lid.les2) ? (
                                <>
                                  {clean(lid.les) ? `Les: ${lid.les}` : "Les: -"}
                                  {clean(lid.les2) ? ` • 2e: ${lid.les2}` : ""}
                                </>
                              ) : (
                                "Geen les ingevuld"
                              )}
                            </div>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </div>

            <div className="space-y-1 mt-6 text-sm">
              {jarigVandaag.length > 0 && (
                <p className="text-pink-400">
                  🎉 Vandaag jarig: {jarigVandaag.join(", ")}
                </p>
              )}
              {jarigMorgen.length > 0 && (
                <p className="text-pink-300">
                  🎂 Morgen jarig: {jarigMorgen.join(", ")}
                </p>
              )}
            </div>
          </>
        )}

        {showModal && geselecteerdLid && (
          <DetailModal lid={geselecteerdLid} onClose={() => setShowModal(false)} />
        )}
      </main>
    </AuthGuard>
  );
}

/* ---------- Detail componenten ---------- */

function Detail({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-gray-400 mb-1">
        {label}
      </div>
      <div className="whitespace-pre-line text-sm">{value}</div>
    </div>
  );
}

function WhatsAppIcon() {
  return <img src="/whatsapp.png" alt="WhatsApp" className="w-5 h-5" />;
}

function DetailModal({ lid, onClose }: { lid: Lid; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 px-4">
      <div className="w-full max-w-lg bg-zinc-900 border border-zinc-700 rounded-2xl p-6 relative max-h-[90vh] overflow-y-auto">
        <button
          className="absolute right-4 top-4 text-gray-400 hover:text-white text-xl"
          onClick={onClose}
          aria-label="Sluiten"
        >
          ×
        </button>

        <h2 className="text-xl font-bold text-pink-400 mb-1">{lid.naam}</h2>
        <p className="text-sm text-gray-400 mb-4">
          {lid.les}
          {lid.les2 ? ` • 2e les: ${lid.les2}` : ""}
        </p>

        <div className="grid grid-cols-1 gap-4 text-sm">
          <Detail
            label="Email"
            value={
              lid.email ? (
                <a
                  href={`mailto:${lid.email}`}
                  className="text-pink-400 underline break-all"
                >
                  {lid.email}
                </a>
              ) : (
                <span>-</span>
              )
            }
          />

          <Detail
            label="Telefoon"
            value={
              <>
                {lid.tel1 && (
                  <div className="mb-1 flex items-center gap-2">
                    <a
                      href={`tel:${formatTelefoon(lid.tel1)}`}
                      className="text-pink-400 underline"
                    >
                      {formatTelefoon(lid.tel1)}
                    </a>
                    <a
                      href={formatWhatsAppUrl(lid.tel1)}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label="WhatsApp"
                      className="inline-flex"
                    >
                      <WhatsAppIcon />
                    </a>
                  </div>
                )}
                {lid.tel2 && (
                  <div className="flex items-center gap-2">
                    <a
                      href={`tel:${formatTelefoon(lid.tel2)}`}
                      className="text-pink-400 underline"
                    >
                      {formatTelefoon(lid.tel2)}
                    </a>
                    <a
                      href={formatWhatsAppUrl(lid.tel2)}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label="WhatsApp"
                      className="inline-flex"
                    >
                      <WhatsAppIcon />
                    </a>
                  </div>
                )}
                {!lid.tel1 && !lid.tel2 && <span>-</span>}
              </>
            }
          />

          <Detail label="Soort" value={lid.soort || "-"} />
          <Detail label="Toestemming beeldmateriaal" value={lid.toestemming || "-"} />
          <Detail label="Geboortedatum" value={formatDatum(lid.geboortedatum) || "-"} />
          <Detail
            label="Adres"
            value={lid.adres ? `${lid.adres}\n${lid.postcode} ${lid.plaats}` : "-"}
          />
          <Detail
            label="Datum akkoord voorwaarden"
            value={formatDatum(lid.datumGoedkeuring) || "-"}
          />
        </div>

        <button
          className="mt-6 w-full bg-pink-500 hover:bg-pink-600 transition-colors rounded-full py-3 font-semibold"
          onClick={onClose}
        >
          Sluiten
        </button>
      </div>
    </div>
  );
}
