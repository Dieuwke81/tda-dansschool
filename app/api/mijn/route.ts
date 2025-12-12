
import { NextRequest, NextResponse } from "next/server";
import { verifySession, cookieName } from "@/lib/auth";

export const runtime = "nodejs";

function clean(s: unknown) {
  return String(s ?? "").trim();
}

// simpele CSV parser (werkt ook met komma’s in quotes)
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

export async function GET(req: NextRequest) {
  const token = req.cookies.get(cookieName)?.value;
  if (!token) {
    return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  }

  let username = "";
  try {
    const session = await verifySession(token);
    username = clean((session as any)?.username);
  } catch {
    return NextResponse.json({ error: "Ongeldige sessie" }, { status: 401 });
  }

  if (!username) {
    return NextResponse.json(
      { error: "Gebruiker ontbreekt in sessie" },
      { status: 400 }
    );
  }

  const sheetUrl = process.env.SHEET_URL;
  if (!sheetUrl) {
    return NextResponse.json(
      { error: "SHEET_URL ontbreekt" },
      { status: 500 }
    );
  }

  let csv = "";
  try {
    const r = await fetch(sheetUrl, { cache: "no-store" });
    if (!r.ok) throw new Error("Sheet niet bereikbaar");
    csv = await r.text();
  } catch {
    return NextResponse.json(
      { error: "Kon Google Sheet niet ophalen" },
      { status: 500 }
    );
  }

  const lines = csv.trim().split("\n");
  const [, ...rows] = lines;

  // Kolommen:
  // B=1 naam
  // C=2 email
  // D=3 les
  // E=4 2de les
  // F=5 soort
  // G=6 toestemming
  // H=7 tel1
  // I=8 tel2
  // J=9 geboortedatum
  // K=10 adres
  // L=11 postcode
  // M=12 plaats
  // O=14 username

  const row = rows
    .map(parseCsvLine)
    .find((c) => clean(c[14]) === username);

  if (!row) {
    return NextResponse.json(
      { error: "Account niet gevonden" },
      { status: 404 }
    );
  }

  return NextResponse.json({
    naam: row[1],
    email: row[2],
    les: row[3],
    tweedeLes: row[4],
    soort: row[5],
    toestemmingBeeld: row[6],
    telefoon1: row[7],
    telefoon2: row[8],
    geboortedatum: row[9],
    adres: row[10],
    postcode: row[11],
    plaats: row[12],
  });
}
