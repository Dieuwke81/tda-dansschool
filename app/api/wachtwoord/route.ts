
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { verifySession, signSession, cookieName } from "@/lib/auth";

export const runtime = "nodejs";

function clean(s: unknown) {
  return String(s ?? "").trim();
}

// normaliseer header namen (spaties/case stabiel)
function h(s: unknown) {
  return clean(s).toLowerCase().replace(/\s+/g, " ");
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

function idx(map: Record<string, number>, headerName: string) {
  const i = map[h(headerName)];
  return typeof i === "number" ? i : -1;
}

export async function POST(req: NextRequest) {
  const token = req.cookies.get(cookieName)?.value;
  if (!token) {
    return NextResponse.json({ success: false, error: "Niet ingelogd" }, { status: 401 });
  }

  let session: any;
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
  if (lines.length < 2) {
    return NextResponse.json({ success: false, error: "Sheet is leeg" }, { status: 500 });
  }

  const header = parseCsvLine(lines[0]);
  const map: Record<string, number> = {};
  header.forEach((name, i) => (map[h(name)] = i));

  const iUsername = idx(map, "username");
  const iHash = idx(map, "password_hash");

  if (iUsername === -1 || iHash === -1) {
    return NextResponse.json(
      { success: false, error: "Sheet kolommen missen (username/password_hash)" },
      { status: 500 }
    );
  }

  const rows = lines.slice(1);
  const row = rows.map(parseCsvLine).find((c) => clean(c[iUsername]) === username);

  if (!row) {
    return NextResponse.json({ success: false, error: "Account niet gevonden" }, { status: 404 });
  }

  const currentHash = clean(row[iHash]);
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

  // Update sheet via Apps Script (hash + vlag op NEE)
  try {
    const r = await fetch(writeUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
      body: JSON.stringify({
        secret: writeSecret,
        username,
        newHash,
        mustChangePassword: false, // 👈 vertel Apps Script dat hij op NEE moet zetten
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
    rol: (session?.rol as any) ?? "lid",
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
