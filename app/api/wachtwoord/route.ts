import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { verifySession, signSession, cookieName } from "@/lib/auth";

export const runtime = "nodejs";

function clean(s: unknown) {
  return String(s ?? "").trim();
}

// CSV parser (werkt ook met komma’s in quotes)
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

export async function POST(req: NextRequest) {
  const token = req.cookies.get(cookieName)?.value;
  if (!token) {
    return NextResponse.json({ success: false, error: "Niet ingelogd" }, { status: 401 });
  }

  let session;
  try {
    session = await verifySession(token);
  } catch {
    return NextResponse.json({ success: false, error: "Ongeldige sessie" }, { status: 401 });
  }

  const username = clean(session?.username);
  if (!username) {
    return NextResponse.json({ success: false, error: "Gebruiker ontbreekt in sessie" }, { status: 401 });
  }

  let currentPassword = "";
  let newPassword = "";
  let confirmPassword = "";

  try {
    const body = await req.json();
    currentPassword = String(body?.currentPassword ?? "");
    newPassword = String(body?.newPassword ?? "");
    confirmPassword = String(body?.confirmPassword ?? "");
  } catch {
    return NextResponse.json({ success: false, error: "Ongeldige invoer" }, { status: 400 });
  }

  if (!currentPassword || !newPassword || !confirmPassword) {
    return NextResponse.json({ success: false, error: "Alle velden zijn verplicht" }, { status: 400 });
  }

  if (newPassword !== confirmPassword) {
    return NextResponse.json({ success: false, error: "Nieuwe wachtwoorden komen niet overeen" }, { status: 400 });
  }

  if (newPassword.length < 8) {
    return NextResponse.json({ success: false, error: "Wachtwoord moet minimaal 8 tekens zijn" }, { status: 400 });
  }

  const sheetUrl = process.env.SHEET_URL;
  if (!sheetUrl) {
    return NextResponse.json({ success: false, error: "SHEET_URL ontbreekt" }, { status: 500 });
  }

  // Lees huidige hash uit sheet (via CSV)
  let csv = "";
  try {
    const r = await fetch(sheetUrl, { cache: "no-store" });
    if (!r.ok) throw new Error("Sheet niet bereikbaar");
    csv = await r.text();
  } catch {
    return NextResponse.json({ success: false, error: "Kon Google Sheet niet ophalen" }, { status: 500 });
  }

  const lines = csv.trim().split("\n");
  const [, ...rows] = lines;

  const row = rows.map(parseCsvLine).find((c) => clean(c[14]) === username); // O = 14
  if (!row) {
    return NextResponse.json({ success: false, error: "Account niet gevonden" }, { status: 404 });
  }

  const currentHash = clean(row[15]); // P = 15
  if (!currentHash) {
    return NextResponse.json({ success: false, error: "Nog geen wachtwoord ingesteld" }, { status: 403 });
  }

  const ok = await bcrypt.compare(currentPassword, currentHash);
  if (!ok) {
    return NextResponse.json({ success: false, error: "Huidig wachtwoord is onjuist" }, { status: 401 });
  }

  // Nieuwe hash maken
  const newHash = await bcrypt.hash(newPassword, 10);

  const writeUrl = process.env.SHEET_WRITE_URL;
  const writeSecret = process.env.SHEET_WRITE_SECRET;

  if (!writeUrl || !writeSecret) {
    return NextResponse.json(
      { success: false, error: "SHEET_WRITE_URL of SHEET_WRITE_SECRET ontbreekt" },
      { status: 500 }
    );
  }

  // Update sheet via Apps Script
  try {
    const r = await fetch(writeUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
      body: JSON.stringify({
        secret: writeSecret,
        username,
        newHash,
      }),
    });

    const resp = await r.json().catch(() => null);
    if (!r.ok || !resp?.ok) {
      return NextResponse.json(
        { success: false, error: resp?.error || "Kon wachtwoord niet opslaan" },
        { status: 500 }
      );
    }
  } catch {
    return NextResponse.json({ success: false, error: "Kon wachtwoord niet opslaan" }, { status: 500 });
  }

  // Nieuwe sessie token uitgeven (mustChangePassword uit)
  const newToken = await signSession({
    rol: session.rol ?? "lid",
    username,
    mustChangePassword: false,
  });

  const res = NextResponse.json({ success: true });
  res.cookies.set(cookieName, newToken, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  return res;
}
