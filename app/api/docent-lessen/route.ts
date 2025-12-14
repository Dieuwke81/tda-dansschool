import { NextRequest, NextResponse } from "next/server";
import { verifySession, cookieName, type Rol } from "@/lib/auth";

export const runtime = "nodejs";

function clean(s: unknown) {
  return String(s ?? "").trim();
}

function norm(s: unknown) {
  return clean(s)
    .replace(/\u00A0/g, " ")
    .replace(/\s+/g, " ")
    .toLowerCase();
}

// CSV parser (met quotes)
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
  const docentenUrl = process.env.SHEET_DOCENTEN_URL;
  if (!docentenUrl) {
    return NextResponse.json({ error: "SHEET_DOCENTEN_URL ontbreekt" }, { status: 500 });
  }

  const token = req.cookies.get(cookieName)?.value;
  if (!token) return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });

  let rol: Rol | undefined;
  let username = "";

  try {
    const session: any = await verifySession(token);
    rol = session.rol as Rol;
    username = clean(session.username);
  } catch {
    return NextResponse.json({ error: "Ongeldige sessie" }, { status: 401 });
  }

  if (rol !== "docent" && rol !== "eigenaar") {
    return NextResponse.json({ error: "Geen toegang" }, { status: 403 });
  }

  // Eigenaar: hoeft dit eigenlijk niet, maar oké -> lege lijst (frontend gebruikt dit alleen voor docent)
  if (rol === "eigenaar") {
    return NextResponse.json({ lessons: [] }, { status: 200 });
  }

  const r = await fetch(docentenUrl, { cache: "no-store" });
  if (!r.ok) {
    return NextResponse.json({ error: "Kon Docenten-sheet niet ophalen" }, { status: 500 });
  }

  const csv = await r.text();
  const lines = csv.trim().split("\n");
  if (lines.length < 2) return NextResponse.json({ lessons: [] }, { status: 200 });

  const header = parseCsvLine(lines[0]).map(norm);
  const iUser = header.indexOf("username");
  const iLes = header.indexOf("les");

  if (iUser === -1 || iLes === -1) {
    return NextResponse.json(
      { error: "Docenten-tab mist kolommen (username, les)" },
      { status: 500 }
    );
  }

  const u = norm(username);
  const lessons = lines
    .slice(1)
    .filter(Boolean)
    .map(parseCsvLine)
    .filter((row) => norm(row[iUser]) === u)
    .map((row) => clean(row[iLes]))
    .filter(Boolean);

  return NextResponse.json({ lessons }, { status: 200 });
}
