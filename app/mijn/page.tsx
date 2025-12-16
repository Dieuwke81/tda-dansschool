
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import AuthGuard from "../auth-guard";

type MijnData = {
  id: string; // ✅ verplicht: we gebruiken NOOIT email als id
  naam: string;
  email: string;
  les: string;
  tweedeLes: string; // ✅ moet matchen met /api/mijn output
  soort: string;
  toestemmingBeeldmateriaal: string;
  telefoon1: string;
  telefoon2: string;
  geboortedatum: string;
  adres: string;
  postcode: string;
  plaats: string;
};

type EditableFieldKey =
  | "naam"
  | "email"
  | "telefoon1"
  | "telefoon2"
  | "geboortedatum"
  | "adres"
  | "postcode"
  | "plaats"
  | "toestemmingBeeldmateriaal";

// welke velden mogen leden zelf wijzigen (lessen/soort meestal niet)
const EDITABLE_FIELDS: { key: EditableFieldKey; label: string; placeholder?: string }[] = [
  { key: "naam", label: "Naam" },
  { key: "email", label: "Email" },
  { key: "telefoon1", label: "Telefoon 1" },
  { key: "telefoon2", label: "Telefoon 2" },
  { key: "geboortedatum", label: "Geboortedatum", placeholder: "bijv. 12-03-2010" },
  { key: "adres", label: "Adres" },
  { key: "postcode", label: "Postcode" },
  { key: "plaats", label: "Plaats" },
  { key: "toestemmingBeeldmateriaal", label: "Toestemming beeldmateriaal", placeholder: "Ja / Nee" },
];

export default function MijnPage() {
  return (
    <AuthGuard allowedRoles={["lid", "eigenaar", "docent"]}>
      <Inner />
    </AuthGuard>
  );
}

function Inner() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<MijnData | null>(null);
  const [error, setError] = useState<string | null>(null);

  // modal state
  const [editKey, setEditKey] = useState<EditableFieldKey | null>(null);
  const [nieuw, setNieuw] = useState("");
  const [notitie, setNotitie] = useState("");
  const [sending, setSending] = useState(false);
  const [toast, setToast] = useState<string>("");

  const editMeta = useMemo(() => {
    if (!editKey) return null;
    return EDITABLE_FIELDS.find((f) => f.key === editKey) ?? null;
  }, [editKey]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch("/api/mijn", {
          cache: "no-store",
          credentials: "same-origin",
        });

        const d = await res.json().catch(() => null);

        if (!res.ok) {
          if (!cancelled) {
            setError(d?.error || "Kon je gegevens niet ophalen");
            if (res.status === 401) router.replace("/login");
          }
          return;
        }

        if (!d) {
          if (!cancelled) setError("Geen gegevens gevonden.");
          return;
        }

        // ✅ harde check: id MOET er zijn, anders geen wijzigingsflow
        const id = String(d?.id ?? "").trim();
        if (!id) {
          if (!cancelled) {
            setError("Je account heeft geen uniek id in de sheet (kolom 'id'). Neem contact op met de eigenaar.");
          }
          return;
        }

        // ✅ normalize naar MijnData shape (ook tweedeLes!)
        const mapped: MijnData = {
          id,
          naam: String(d?.naam ?? ""),
          email: String(d?.email ?? ""),
          les: String(d?.les ?? ""),
          tweedeLes: String(d?.tweedeLes ?? ""), // ✅ let op: tweedeLes
          soort: String(d?.soort ?? ""),
          toestemmingBeeldmateriaal: String(d?.toestemmingBeeldmateriaal ?? ""),
          telefoon1: String(d?.telefoon1 ?? ""),
          telefoon2: String(d?.telefoon2 ?? ""),
          geboortedatum: String(d?.geboortedatum ?? ""),
          adres: String(d?.adres ?? ""),
          postcode: String(d?.postcode ?? ""),
          plaats: String(d?.plaats ?? ""),
        };

        if (!cancelled) setData(mapped);
      } catch {
        if (!cancelled) setError("Kon je gegevens niet ophalen");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [router]);

  async function uitloggen() {
    try {
      await fetch("/api/logout", { method: "POST", credentials: "same-origin" });
    } catch {
      // negeren
    }
    router.replace("/login");
  }

  function openEdit(key: EditableFieldKey) {
    if (!data) return;
    setEditKey(key);
    setNieuw(String((data as any)[key] ?? ""));
    setNotitie("");
    setToast("");
  }

  function closeEdit() {
    setEditKey(null);
    setNieuw("");
    setNotitie("");
    setSending(false);
  }

  async function submitChange() {
    if (!data || !editKey) return;

    const oud = String((data as any)[editKey] ?? "");
    const nieuwValue = String(nieuw ?? "").trim();

    if (!nieuwValue) {
      setToast("Vul een nieuwe waarde in.");
      return;
    }
    if (nieuwValue === oud.trim()) {
      setToast("Dit is hetzelfde als je huidige waarde.");
      return;
    }

    // ✅ ALTIJD unieke id uit sheet gebruiken
    const lid_id = data.id;

    setSending(true);
    setToast("");

    try {
      const r = await fetch("/api/wijzigingen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          lid_id,
          veld: editKey,
          oud,
          nieuw: nieuwValue,
          notitie: String(notitie ?? "").trim(),
        }),
      });

      const j = await r.json().catch(() => null);
      if (!r.ok || !j?.ok) throw new Error(j?.error || "Kon wijzigingsverzoek niet versturen");

      setToast("✅ Verzoek verstuurd. De eigenaar moet dit eerst goedkeuren.");
      setTimeout(() => {
        closeEdit();
      }, 900);
    } catch (e: any) {
      setToast(String(e?.message || e || "Er ging iets mis"));
      setSending(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center">
        <p className="text-gray-300">Je gegevens worden geladen…</p>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6 text-center">
        <p className="text-red-400 mb-4">{error}</p>
        <button onClick={uitloggen} className="text-gray-400 underline text-sm">
          Uitloggen
        </button>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6 text-center">
        <p className="text-gray-300 mb-4">Geen gegevens gevonden.</p>
        <button onClick={uitloggen} className="text-gray-400 underline text-sm">
          Uitloggen
        </button>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-xl bg-zinc-900 rounded-xl p-6 border border-zinc-700">
        <h1 className="text-2xl font-bold text-pink-500 mb-2">Mijn gegevens</h1>
        <p className="text-sm text-gray-400 mb-5">
          Wil je iets aanpassen? Klik op <span className="text-gray-200 font-semibold">Wijzigen</span>. De eigenaar
          moet dit eerst goedkeuren.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <Field label="Naam" value={data.naam} onEdit={() => openEdit("naam")} />
          <Field label="Email" value={data.email} onEdit={() => openEdit("email")} />
          <Field label="Les" value={data.les} />
          <Field label="2e les" value={data.tweedeLes} />
          <Field label="Soort" value={data.soort} />
          <Field
            label="Toestemming beeldmateriaal"
            value={data.toestemmingBeeldmateriaal}
            onEdit={() => openEdit("toestemmingBeeldmateriaal")}
          />
          <Field label="Telefoon 1" value={data.telefoon1} onEdit={() => openEdit("telefoon1")} />
          <Field label="Telefoon 2" value={data.telefoon2} onEdit={() => openEdit("telefoon2")} />
          <Field label="Geboortedatum" value={data.geboortedatum} onEdit={() => openEdit("geboortedatum")} />
          <Field label="Adres" value={data.adres} onEdit={() => openEdit("adres")} />
          <Field label="Postcode" value={data.postcode} onEdit={() => openEdit("postcode")} />
          <Field label="Plaats" value={data.plaats} onEdit={() => openEdit("plaats")} />
        </div>

        <div className="mt-6 flex justify-end">
          <button onClick={uitloggen} className="text-gray-400 underline text-sm">
            Uitloggen
          </button>
        </div>
      </div>

      {/* ===== MODAL ===== */}
      {editKey && editMeta && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 px-4">
          <div className="w-full max-w-lg bg-zinc-900 border border-zinc-700 rounded-2xl p-6 relative">
            <button
              className="absolute right-4 top-4 text-gray-400 hover:text-white text-xl"
              onClick={closeEdit}
              aria-label="Sluiten"
              disabled={sending}
            >
              ×
            </button>

            <h2 className="text-xl font-bold text-pink-400 mb-1">Wijziging aanvragen</h2>
            <p className="text-sm text-gray-400 mb-4">{editMeta.label}</p>

            <div className="space-y-3">
              <div className="text-sm">
                <div className="text-xs uppercase tracking-wide text-gray-400 mb-1">Huidige waarde</div>
                <div className="bg-black/40 rounded-lg border border-zinc-800 p-3 text-white">
                  {String((data as any)[editKey] ?? "-") || "-"}
                </div>
              </div>

              <div className="text-sm">
                <div className="text-xs uppercase tracking-wide text-gray-400 mb-1">Nieuwe waarde</div>
                <input
                  value={nieuw}
                  onChange={(e) => setNieuw(e.target.value)}
                  placeholder={editMeta.placeholder ?? ""}
                  className="w-full rounded-lg bg-zinc-950 border border-zinc-700 p-3 text-white"
                  disabled={sending}
                />
              </div>

              <div className="text-sm">
                <div className="text-xs uppercase tracking-wide text-gray-400 mb-1">Notitie (optioneel)</div>
                <textarea
                  value={notitie}
                  onChange={(e) => setNotitie(e.target.value)}
                  placeholder="Bijv. waarom dit gewijzigd moet worden…"
                  className="w-full min-h-[90px] rounded-lg bg-zinc-950 border border-zinc-700 p-3 text-white"
                  disabled={sending}
                />
              </div>

              {toast && <p className="text-sm text-gray-200">{toast}</p>}

              <div className="mt-4 flex gap-3">
                <button
                  onClick={submitChange}
                  disabled={sending}
                  className="flex-1 rounded-full bg-pink-500 px-4 py-3 font-semibold text-black hover:bg-pink-400 disabled:opacity-60"
                >
                  {sending ? "Versturen…" : "Verzoek versturen"}
                </button>
                <button
                  onClick={closeEdit}
                  disabled={sending}
                  className="flex-1 rounded-full border border-zinc-700 px-4 py-3 font-semibold text-white hover:bg-white/5 disabled:opacity-60"
                >
                  Annuleren
                </button>
              </div>

              <p className="text-xs text-gray-500 mt-2">
                Na goedkeuring wordt je gegevenslijst bijgewerkt door de eigenaar.
              </p>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function Field({
  label,
  value,
  onEdit,
}: {
  label: string;
  value: string;
  onEdit?: () => void;
}) {
  return (
    <div className="bg-black/40 rounded-lg border border-zinc-800 p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="text-gray-400 mb-1">{label}</div>

        {onEdit ? (
          <button
            type="button"
            onClick={onEdit}
            className="text-xs text-pink-400 hover:text-pink-300 underline whitespace-nowrap"
          >
            Wijzigen
          </button>
        ) : null}
      </div>

      <div className="text-white break-words">{value || "-"}</div>
    </div>
  );
}
