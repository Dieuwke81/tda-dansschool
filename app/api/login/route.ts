import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { signSession, cookieName, type Rol } from "@/lib/auth";

export const runtime = "nodejs";

function clean(s: unknown) {
  return String(s ?? "").trim();
}

// mini CSV parser (werkt ook met komma’s in quotes)
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
      out.push(cur);
      cur = "";
      continue;
    }

    cur += ch;
  }

  out.push(cur);
  return out.map((x) => x.trim());
}

export async function POST(req: NextRequest) {
  // 0) Lees body: username + wachtwoord
  let username = "";
  let wachtwoord = "";

  try {
    const body = await req.json();
    username = clean(body?.username);
    wachtwoord = String(body?.wachtwoord ?? "");
  } catch {
    return NextResponse.json(
      { success: false, error: "Ongeldige request body" },
      { status: 400 }
    );
  }

  if (!username || !wachtwoord) {
    return NextResponse.json(
      { success: false, error: "Username en wachtwoord zijn verplicht" },
      { status: 400 }
    );
  }

  // 1) Eigenaar-login via ENV
  const ownerUser = clean(process.env.OWNER_USERNAME);
  const ownerPass = String(process.env.OWNER_PASSWORD ?? "");

  if (ownerUser && ownerPass && username === ownerUser) {
    if (wachtwoord !== ownerPass) {
      return NextResponse.json(
        { success: false, error: "Onjuiste inloggegevens" },
        { status: 401 }
      );
    }

    const rol: Rol = "eigenaar";
    const token = await signSession({ rol });

    const res = NextResponse.json({ success: true, rol });
    res.cookies.set(cookieName, token, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });
    return res;
  }

  // 2) Lid-login via Google Sheet (O=username, P=password_hash)
  const sheetUrl = process.env.SHEET_URL;
  if (!sheetUrl) {
    return NextResponse.json(
      { success: false, error: "SHEET_URL ontbreekt op de server" },
      { status: 500 }
    );
  }

  let csv = "";
  try {
    const r = await fetch(sheetUrl, { cache: "no-store" });
    if (!r.ok) {
      return NextResponse.json(
        { success: false, error: "Kon de Google Sheet niet ophalen" },
        { status: 500 }
      );
    }
    csv = await r.text();
  } catch {
    return NextResponse.json(
      { success: false, error: "Fout bij ophalen sheet" },
      { status: 500 }
    );
  }

  const lines = csv.split("\n").map((l) => l.replace(/\r/g, "")).filter(Boolean);
  const [, ...rows] = lines; // header overslaan

  // A..N = 0..13, O=username=14, P=password_hash=15
  const match = rows
    .map(parseCsvLine)
    .find((c) => clean(c[14]) === username);

  if (!match) {
    return NextResponse.json(
      { success: false, error: "Onjuiste inloggegevens" },
      { status: 401 }
    );
  }

  const hash = clean(match[15]);
  if (!hash) {
    return NextResponse.json(
      { success: false, error: "Voor dit account is nog geen wachtwoord ingesteld" },
      { status: 401 }
    );
  }

  const ok = await bcrypt.compare(wachtwoord, hash);
  if (!ok) {
    return NextResponse.json(
      { success: false, error: "Onjuiste inloggegevens" },
      { status: 401 }
    );
  }

  const rol: Rol = "lid";
  const token = await signSession({ rol, username });

  const res = NextResponse.json({ success: true, rol });
  res.cookies.set(cookieName, token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  return res;
}
