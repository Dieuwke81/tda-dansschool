
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

function headerKey(s: unknown) {
  return norm(s);
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
      out.push(cur);
      cur = "";
      continue;
    }

    cur += ch;
  }

  out.push(cur);
  return out;
}

// CSV writer (quoted waar nodig)
function toCsvLine(cols: string[]): string {
  return cols
    .map((v) => {
      const s = String(v ?? "");
      if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
      return s;
    })
    .join(",");
}

async function fetchCsv(url: string, label: string) {
  const r = await fetch(url, { cache: "no-store" });
  if (!r.ok) throw new Error(`${label} niet bereikbaar (status ${r.status})`);
  return await r.text();
}

export async function GET(req: NextRequest) {
  const ledenUrl = process.env.SHEET_LEDEN_URL;
  const docentenUrl = process.env.SHEET_DOCENTEN_URL;

  if (!ledenUrl) {
    return NextResponse.json(
      { error: "SHEET_LEDEN_URL ontbreekt op de server" },
      { status: 500 }
    );
  }

  // 1) cookie check
  const token = req.cookies.get(cookieName)?.value;
  if (!token) {
    return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  }

  // 2) session check
  let rol: Rol | undefined;
  let username = "";

  try {
    const session: any = await verifySession(token);
    rol = session.rol as Rol;
    username = clean(session.username);
  } catch {
    return NextResponse.json({ error: "Ongeldige sessie" }, { status: 401 });
  }

  if (rol !== "eigenaar" && rol !== "docent") {
    return NextResponse.json({ error: "Geen toegang tot leden" }, { status: 403 });
  }

  // 3) leden csv ophalen
  let ledenCsv = "";
  try {
    ledenCsv = await fetchCsv(ledenUrl, "Leden-sheet");
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Kon Google Sheet (Leden) niet ophalen" },
      { status: 500 }
    );
  }

  // ✅ eigenaar: alles terug
  if (rol === "eigenaar") {
    return new NextResponse(ledenCsv, {
      status: 200,
      headers: { "Content-Type": "text/csv; charset=utf-8" },
    });
  }

  // ✅ docent: heeft Docenten-tab nodig
  if (!docentenUrl) {
    return NextResponse.json(
      { error: "SHEET_DOCENTEN_URL ontbreekt op de server" },
      { status: 500 }
    );
  }

  if (!username) {
    return NextResponse.json(
      { error: "Gebruiker ontbreekt in sessie" },
      { status: 401 }
    );
  }

  let docentenCsv = "";
  try {
    docentenCsv = await fetchCsv(docentenUrl, "Docenten-sheet");
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Kon Google Sheet (Docenten) niet ophalen" },
      { status: 500 }
    );
  }

  // ===== Docenten-tab lezen: username -> lessen =====
  const dLines = docentenCsv.trim().split("\n");
  if (dLines.length < 2) {
    // Geen docenten data -> docent ziet geen leden (alleen header terug)
    const onlyHeader = ledenCsv.trim().split("\n")[0] ?? "";
    return new NextResponse(onlyHeader, {
      status: 200,
      headers: { "Content-Type": "text/csv; charset=utf-8" },
    });
  }

  const dHeader = parseCsvLine(dLines[0]);
  const dMap: Record<string, number> = {};
  dHeader.forEach((name, i) => (dMap[headerKey(name)] = i));

  const iDUser = dMap[headerKey("username")];
  const iDLes = dMap[headerKey("les")];

  if (typeof iDUser !== "number" || typeof iDLes !== "number") {
    return NextResponse.json(
      { error: "Docenten-tab mist kolommen (username, les)" },
      { status: 500 }
    );
  }

  const uNorm = norm(username);
  const allowedLessons = new Set(
    dLines
      .slice(1)
      .filter(Boolean)
      .map(parseCsvLine)
      .filter((row) => norm(row[iDUser]) === uNorm)
      .map((row) => norm(row[iDLes]))
      .filter(Boolean)
  );

  // ===== Leden-tab filteren op les/2de les =====
  const lLines = ledenCsv.trim().split("\n");
  if (lLines.length < 1) {
    return new NextResponse(ledenCsv, {
      status: 200,
      headers: { "Content-Type": "text/csv; charset=utf-8" },
    });
  }

  const lHeader = parseCsvLine(lLines[0]);
  const lMap: Record<string, number> = {};
  lHeader.forEach((name, i) => (lMap[headerKey(name)] = i));

  // jouw header is letterlijk: "les" en "2de les"
  const iLes1 = lMap[headerKey("les")];
  const iLes2 = lMap[headerKey("2de les")];

  if (typeof iLes1 !== "number" || typeof iLes2 !== "number") {
    return NextResponse.json(
      { error: "Leden-tab mist kolommen (les, 2de les)" },
      { status: 500 }
    );
  }

  const filteredRows =
    allowedLessons.size === 0
      ? []
      : lLines
          .slice(1)
          .filter(Boolean)
          .map(parseCsvLine)
          .filter((row) => {
            const les1 = norm(row[iLes1]);
            const les2 = norm(row[iLes2]);
            return allowedLessons.has(les1) || allowedLessons.has(les2);
          });

  const outCsv = [toCsvLine(lHeader), ...filteredRows.map(toCsvLine)].join("\n");

  return new NextResponse(outCsv, {
    status: 200,
    headers: { "Content-Type": "text/csv; charset=utf-8" },
  });
}
