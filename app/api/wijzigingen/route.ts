
import { NextRequest, NextResponse } from "next/server";
import { verifySession, cookieName, type Rol } from "@/lib/auth";

export const runtime = "nodejs";

// ✅ Zonder types-problemen op Vercel (geen @types/web-push nodig)
const webpush: any = require("web-push");

function clean(v: unknown) {
  return String(v ?? "").trim();
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
    body: JSON.stringify({ ...payload, secret }),
  });

  const j = await r.json().catch(() => null);
  if (!j?.ok) {
    throw new Error(j?.error || "Apps Script fout");
  }
  return j;
}

function ensureWebPushConfigured() {
  const pub = process.env.VAPID_PUBLIC_KEY || process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";
  const priv = process.env.VAPID_PRIVATE_KEY || "";
  const subject = process.env.VAPID_SUBJECT || "mailto:info@tda-dansschool.nl";

  if (!pub) throw new Error("VAPID_PUBLIC_KEY ontbreekt (Vercel env)");
  if (!priv) throw new Error("VAPID_PRIVATE_KEY ontbreekt (Vercel env)");

  webpush.setVapidDetails(subject, pub, priv);
}

async function sendPushToOwners(payload: {
  title: string;
  body: string;
  url?: string;
  tag?: string;
}) {
  // 1) subscriptions ophalen (alle eigenaars)
  const subsResp = await postToAppsScript({
    action: "listOwnerPush",
    rol: "eigenaar",
  });

  const items = Array.isArray(subsResp?.items) ? subsResp.items : [];
  if (items.length === 0) {
    return { sent: 0, failed: 0, reason: "Geen owner push subscriptions gevonden" };
  }

  // 2) web-push config
  ensureWebPushConfigured();

  // 3) versturen naar allemaal
  let sent = 0;
  let failed = 0;

  const message = JSON.stringify({
    title: payload.title,
    body: payload.body,
    url: payload.url || "/wijzigingen",
    tag: payload.tag || "wijziging",
  });

  await Promise.all(
    items.map(async (sub: any) => {
      try {
        await webpush.sendNotification(sub, message);
        sent++;
      } catch {
        // ❗Niet verwijderen/disable (jij wil niks aan subscriptions wijzigen)
        failed++;
      }
    })
  );

  return { sent, failed };
}

/**
 * GET /api/wijzigingen?status=NIEUW
 * Alleen eigenaar kan lijst ophalen
 */
export async function GET(req: NextRequest) {
  const s = await requireSession(req);
  if (!s.ok) return NextResponse.json({ ok: false, error: s.error }, { status: s.status });

  if (s.rol !== "eigenaar") {
    return NextResponse.json({ ok: false, error: "Geen toegang" }, { status: 403 });
  }

  const status = req.nextUrl.searchParams.get("status") ?? "";

  try {
    const j = await postToAppsScript({
      action: "listChangeRequests",
      status,
    });

    return NextResponse.json({ ok: true, items: j.items ?? [] }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}

/**
 * POST /api/wijzigingen
 * Lid maakt een wijzigingsverzoek aan
 * ✅ EN: push naar alle eigenaars (alleen bij nieuw verzoek)
 */
export async function POST(req: NextRequest) {
  const s = await requireSession(req);
  if (!s.ok) return NextResponse.json({ ok: false, error: s.error }, { status: s.status });

  if (s.rol !== "lid") {
    return NextResponse.json({ ok: false, error: "Alleen leden kunnen dit aanvragen" }, { status: 403 });
  }

  let body: any = null;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Ongeldige invoer" }, { status: 400 });
  }

  const lid_id = clean(body?.lid_id); // ✅ moet jouw unieke Leden.id zijn
  const veld = clean(body?.veld); // bv. telefoon1 / email / toestemmingBeeldmateriaal
  const oud = clean(body?.oud);
  const nieuw = clean(body?.nieuw);
  const notitie = clean(body?.notitie);

  if (!lid_id || !veld) {
    return NextResponse.json({ ok: false, error: "lid_id en veld zijn verplicht" }, { status: 400 });
  }

  try {
    // 1) verzoek opslaan
    const j = await postToAppsScript({
      action: "createChangeRequest",
      aangevraagd_door_username: s.username,
      lid_id,
      veld,
      oud,
      nieuw,
      notitie,
    });

    const requestId = String(j?.id || "");

    // 2) push sturen (best effort: request blijft sowieso opgeslagen)
    let push = { sent: 0, failed: 0, error: "" as string | null };

    try {
      const r = await sendPushToOwners({
        title: "Nieuw wijzigingsverzoek",
        body: `Lid ${lid_id} wil "${veld}" aanpassen.`,
        url: "/wijzigingen",
        tag: "wijziging-nieuw",
      });
      push.sent = r.sent;
      push.failed = r.failed;
    } catch (e: any) {
      push.error = String(e?.message || e);
    }

    return NextResponse.json(
      {
        ok: true,
        id: requestId,
        push,
      },
      { status: 200 }
    );
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}

/**
 * PATCH /api/wijzigingen
 * Eigenaar zet status (GOEDGEKEURD / AFGEKEURD)
 * ✅ Apps Script past bij GOEDGEKEURD direct de Leden tab aan
 */
export async function PATCH(req: NextRequest) {
  const s = await requireSession(req);
  if (!s.ok) return NextResponse.json({ ok: false, error: s.error }, { status: s.status });

  if (s.rol !== "eigenaar") {
    return NextResponse.json({ ok: false, error: "Geen toegang" }, { status: 403 });
  }

  let body: any = null;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Ongeldige invoer" }, { status: 400 });
  }

  const id = clean(body?.id);
  const status = clean(body?.status); // "GOEDGEKEURD" | "AFGEKEURD"

  if (!id || !status) {
    return NextResponse.json({ ok: false, error: "id en status verplicht" }, { status: 400 });
  }

  if (status !== "GOEDGEKEURD" && status !== "AFGEKEURD") {
    return NextResponse.json({ ok: false, error: "Status moet GOEDGEKEURD of AFGEKEURD zijn" }, { status: 400 });
  }

  try {
    await postToAppsScript({
      action: "setChangeRequestStatus",
      id,
      status,
      behandeld_door: s.username || "eigenaar",
    });

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}
