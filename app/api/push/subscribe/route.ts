import { NextRequest, NextResponse } from "next/server";
import { verifySession, cookieName } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const token = req.cookies.get(cookieName)?.value;
  if (!token) return NextResponse.json({ ok: false, error: "Niet ingelogd" }, { status: 401 });

  let session: any;
  try {
    session = await verifySession(token);
  } catch {
    return NextResponse.json({ ok: false, error: "Ongeldige sessie" }, { status: 401 });
  }

  // Alleen eigenaar (en evt docent later) mag zich registreren
  const rol = session?.rol;
  const username = session?.username ?? "";
  if (rol !== "eigenaar") {
    return NextResponse.json({ ok: false, error: "Geen toegang" }, { status: 403 });
  }

  const writeUrl = process.env.SHEET_WRITE_URL;
  const writeSecret = process.env.SHEET_WRITE_SECRET;
  if (!writeUrl || !writeSecret) {
    return NextResponse.json({ ok: false, error: "SHEET_WRITE_URL/SECRET ontbreekt" }, { status: 500 });
  }

  const body = await req.json().catch(() => null);
  const subscription = body?.subscription;
  const device_label = body?.device_label ?? "";

  if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
    return NextResponse.json({ ok: false, error: "Subscription ontbreekt/ongeldig" }, { status: 400 });
  }

  const r = await fetch(writeUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
    body: JSON.stringify({
      secret: writeSecret,
      action: "upsertPush",
      rol,
      username,
      device_label,
      subscription,
    }),
  });

  const resp = await r.json().catch(() => null);
  if (!r.ok || !resp?.ok) {
    return NextResponse.json({ ok: false, error: resp?.error || "Opslaan mislukt" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
