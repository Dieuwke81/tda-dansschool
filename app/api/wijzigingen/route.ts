
import { NextRequest, NextResponse } from "next/server";
import { verifySession, cookieName, type Rol } from "@/lib/auth";
import webpush from "web-push";

export const runtime = "nodejs";

/* ================= HELPERS ================= */

function clean(v: unknown) {
  return String(v ?? "").trim();
}

function json(ok: boolean, payload: Record<string, any>, status = 200) {
  return NextResponse.json({ ok, ...payload }, { status });
}

async function requireSession(req: NextRequest) {
  const token = req.cookies.get(cookieName)?.value;
  if (!token) return { ok: false as const, error: "Niet ingelogd", status: 401 as const };

  try {
    const session: any = await verifySession(token);
    const rol = (session?.rol ?? "gast") as Rol;
    const username = clean(session?.username);
    return { ok: true as const, rol, username };
  } catch {
    return { ok: false as const, error: "Ongeldige sessie", status: 401 as const };
  }
}

async function postToAppsScript(payload: any) {
  const url = process.env.SHEET_WRITE_URL;
  const secret = process.env.SHEET_WRITE_SECRET;

  if (!url) throw new Error("SHEET_WRITE_URL ontbreekt");
  if (!secret) throw new Error("SHEET_WRITE_SECRET ontbreekt");

  const r = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    // apps script verwacht { ...payload, secret }
    body: JSON.stringify({ ...payload, secret }),
    cache: "no-store",
  });

  const j = await r.json().catch(() => null);
  if (!j?.ok) throw new Error(j?.error || "Apps Script fout");
  return j;
}

/* ================= WEB PUSH ================= */

let webpushReady = false;

function setupWebPushOnce() {
  if (webpushReady) return;

  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";
  const priv = process.env.VAPID_PRIVATE_KEY || "";

  if (!pub || !priv) {
    // Niet hard crashen hier; we gooien een nette error waar nodig
    throw new Error("VAPID keys ontbreken (NEXT_PUBLIC_VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY)");
  }

  // mailto mag wat jij wil (is alleen contact info)
  webpush.setVapidDetails("mailto:info@tatisdanceagency.nl", pub, priv);
  webpushReady = true;
}

type PushSubRow = {
  endpoint: string;
  p256dh: string;
  auth: string;
  enabled?: boolean;
};

async function sendPushToOwners(message: { title: string; body: string; url?: string }) {
  setupWebPushOnce();

  // Haal owner subscriptions uit je sheet (Apps Script)
  // >>> Als jouw Apps Script action anders heet: pas HIER aan.
  const j = await postToAppsScript({
    action: "listOwnerPush",
    rol: "eigenaar",
  });

  const items: PushSubRow[] = Array.isArray(j?.items) ? j.items : [];
  const subs = items
    .filter((x) => x && x.endpoint && x.p256dh && x.auth)
    .filter((x) => x.enabled !== false);

  if (subs.length === 0) return;

  const payload = JSON.stringify({
    title: message.title,
    body: message.body,
    url: message.url || "/wijzigingen",
  });

  // Best-effort: push fouten mogen je API-call niet laten falen
  await Promise.allSettled(
    subs.map((s) =>
      webpush.sendNotification(
        {
          endpoint: s.endpoint,
          keys: { p256dh: s.p256dh, auth: s.auth },
        } as any,
        payload
      )
    )
  );
}

/* ================= ROUTES ================= */

/**
 * GET /api/wijzigingen?status=NIEUW
 * Alleen eigenaar kan lijst ophalen
 */
export async function GET(req: NextRequest) {
  const s = await requireSession(req);
  if (!s.ok) return json(false, { error: s.error }, s.status);

  if (s.rol !== "eigenaar") return json(false, { error: "Geen toegang" }, 403);

  const status = req.nextUrl.searchParams.get("status") ?? "";

  try {
    const j = await postToAppsScript({
      action: "listChangeRequests",
      status,
    });

    return json(true, { items: j.items ?? [] }, 200);
  } catch (e: any) {
    return json(false, { error: String(e?.message || e) }, 500);
  }
}

/**
 * POST /api/wijzigingen
 * Lid maakt een wijzigingsverzoek aan + push naar eigenaars
 */
export async function POST(req: NextRequest) {
  const s = await requireSession(req);
  if (!s.ok) return json(false, { error: s.error }, s.status);

  if (s.rol !== "lid") {
    return json(false, { error: "Alleen leden kunnen dit aanvragen" }, 403);
  }

  let body: any = null;
  try {
    body = await req.json();
  } catch {
    return json(false, { error: "Ongeldige invoer" }, 400);
  }

  const lid_id = clean(body?.lid_id);
  const veld = clean(body?.veld);
  const oud = clean(body?.oud);
  const nieuw = clean(body?.nieuw);
  const notitie = clean(body?.notitie);

  if (!lid_id || !veld) {
    return json(false, { error: "lid_id en veld zijn verplicht" }, 400);
  }

  try {
    // 1) Opslaan in Wijzigingen sheet
    const j = await postToAppsScript({
      action: "createChangeRequest",
      aangevraagd_door_username: s.username,
      lid_id,
      veld,
      oud,
      nieuw,
      notitie,
    });

    // 2) Push naar alle eigenaars (alleen bij verzoek)
    // Best-effort: als push faalt, verzoek is wél aangemaakt
    try {
      await sendPushToOwners({
        title: "Nieuw wijzigingsverzoek",
        body: `${veld}: "${oud || "-"}" → "${nieuw || "-"}" (lid_id: ${lid_id})`,
        url: "/wijzigingen",
      });
    } catch {
      // bewust negeren; je ziet verzoek sowieso in de sheet + in de pagina
    }

    return json(true, { id: j.id }, 200);
  } catch (e: any) {
    return json(false, { error: String(e?.message || e) }, 500);
  }
}

/**
 * PATCH /api/wijzigingen
 * Eigenaar zet status (GOEDGEKEURD / AFGEKEURD)
 * (Doorvoeren in Leden-sheet gebeurt in jouw Apps Script bij setChangeRequestStatus)
 */
export async function PATCH(req: NextRequest) {
  const s = await requireSession(req);
  if (!s.ok) return json(false, { error: s.error }, s.status);

  if (s.rol !== "eigenaar") return json(false, { error: "Geen toegang" }, 403);

  let body: any = null;
  try {
    body = await req.json();
  } catch {
    return json(false, { error: "Ongeldige invoer" }, 400);
  }

  const id = clean(body?.id);
  const status = clean(body?.status); // GOEDGEKEURD | AFGEKEURD

  if (!id || !status) return json(false, { error: "id en status verplicht" }, 400);
  if (status !== "GOEDGEKEURD" && status !== "AFGEKEURD") {
    return json(false, { error: "Ongeldige status" }, 400);
  }

  try {
    await postToAppsScript({
      action: "setChangeRequestStatus",
      id,
      status,
      behandeld_door: s.username || "eigenaar",
    });

    return json(true, {}, 200);
  } catch (e: any) {
    return json(false, { error: String(e?.message || e) }, 500);
  }
}
