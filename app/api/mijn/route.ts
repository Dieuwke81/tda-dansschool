import { NextRequest, NextResponse } from "next/server";
import { verifySession, cookieName, type Rol } from "@/lib/auth";

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

export async function GET(req: NextRequest) {
  const token = req.cookies.get(cookieName)?.value;
  if (!token) {
    return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  }

  let rol: Rol = "gast";
  let username = "";

  try {
    const session = await verifySession(token);
    rol = (session.rol ?? "gast") as Rol;
    username = clean(session.username);
  } catch {
    return NextResponse.json({ error: "Ongeldige sessie" }, { status: 401 });
  }

  if (rol !== "lid") {
    return NextResponse.json({ error: "Alleen voor leden" }, { status: 403 });
  }
  if (!username) {
    return NextResponse.json({ error: "Geen username in sessie" }, { status: 400 });
  }

  const sheetUrl = process.env.SHEET_URL;
  if (!sheetUrl) {
    return NextResponse.json({ error: "SHEET_URL ontbreekt" }, { status: 500 });
  }

  const r = await fetch(sheetUrl, { cache: "no-store" });
  if (!r.ok) {
    return NextResponse.json({ error: "Kon sheet niet ophalen" }, { status: 500 });
  }

  const csv = await r.text();
  const lines = csv.split("\n").map((l) => l.replace(/\r/g, "")).filter(Boolean);
  const [, ...rows] = lines;

  // A..N = 0..13, O=username=14, P=password_hash=15
  const row = rows
    .map(parseCsvLine)
    .find((c) => clean(c[14]) === username);

  if (!row) {
    return NextResponse.json({ error: "Lid niet gevonden" }, { status: 404 });
  }

  const data = {
    id: clean(row[0]),
    naam: clean(row[1]),
    email: clean(row[2]),
    les: clean(row[3]),
    tweedeLes: clean(row[4]),
    soort: clean(row[5]),
    toestemmingBeeldmateriaal: clean(row[6]),
    telefoon1: clean(row[7]),
    telefoon2: clean(row[8]),
    geboortedatum: clean(row[9]),
    adres: clean(row[10]),
    postcode: clean(row[11]),
    plaats: clean(row[12]),
    datumGoedkeuring: clean(row[13]),
    username: clean(row[14]),
  };

  return NextResponse.json({ success: true, data }, { status: 200 });
}
