import { NextRequest, NextResponse } from "next/server";
import { verifySession, cookieName, type Rol } from "@/lib/auth";

export const runtime = "nodejs";

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

/**
 * GET /api/wijzigingen?status=NIEUW
 * Alleen eigenaar (en eventueel docent als je dat later wilt) kan lijst ophalen
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

  const lid_id = clean(body?.lid_id);
  const veld = clean(body?.veld);
  const oud = clean(body?.oud);
  const nieuw = clean(body?.nieuw);
  const notitie = clean(body?.notitie);

  if (!lid_id || !veld) {
    return NextResponse.json({ ok: false, error: "lid_id en veld zijn verplicht" }, { status: 400 });
  }

  try {
    const j = await postToAppsScript({
      action: "createChangeRequest",
      aangevraagd_door_username: s.username,
      lid_id,
      veld,
      oud,
      nieuw,
      notitie,
    });

    return NextResponse.json({ ok: true, id: j.id }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}

/**
 * PATCH /api/wijzigingen
 * Eigenaar zet status (GOEDGEKEURD / AFGEKEURD)
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
