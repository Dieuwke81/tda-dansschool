
import { NextRequest, NextResponse } from "next/server";
import { verifySession, cookieName } from "@/lib/auth";

export const runtime = "nodejs";

function clean(s: unknown) {
  return String(s ?? "").trim();
}

function h(s: unknown) {
  return clean(s).toLowerCase().replace(/\s+/g, " ");
}

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
      { status: 401 }
    );
  }

  const sheetUrl = process.env.SHEET_URL;
  if (!sheetUrl) {
    return NextResponse.json({ error: "SHEET_URL ontbreekt" }, { status: 500 });
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
  if (lines.length < 2) {
    return NextResponse.json({ error: "Sheet is leeg" }, { status: 500 });
  }

  const header = parseCsvLine(lines[0]);
  const map: Record<string, number> = {};
  header.forEach((name, i) => {
    map[h(name)] = i;
  });

  const iUsername = idx(map, "username");
  if (iUsername === -1) {
    return NextResponse.json(
      { error: "Kolom 'username' niet gevonden in sheet" },
      { status: 500 }
    );
  }

  const rows = lines.slice(1);
  const row = rows
    .map(parseCsvLine)
    .find((c) => clean(c[iUsername]) === username);

  if (!row) {
    return NextResponse.json({ error: "Account niet gevonden" }, { status: 404 });
  }

  const get = (name: string) => {
    const i = idx(map, name);
    return i === -1 ? "" : clean(row[i]);
  };

  return NextResponse.json({
    id: get("id"), // ⭐️ BELANGRIJK
    naam: get("naam"),
    email: get("email"),
    les: get("les"),
    tweedeLes: get("2de les"),
    soort: get("soort"),
    toestemmingBeeldmateriaal: get("toestemming beeldmateriaal"),
    telefoon1: get("telefoon 1"),
    telefoon2: get("telefoon 2"),
    geboortedatum: get("geboortedatum"),
    adres: get("adres"),
    postcode: get("postcode"),
    plaats: get("plaats"),
  });
}
