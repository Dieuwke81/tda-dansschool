
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { signSession, cookieName } from "@/lib/auth";

export const runtime = "nodejs";

// Netjes opschonen voor opslaan
function clean(s: unknown) {
  return String(s ?? "").trim();
}

// Betrouwbaar vergelijken (spaties/NBSP/hoofdletters)
function norm(s: unknown) {
  return String(s ?? "")
    .replace(/\u00A0/g, " ") // NBSP -> spatie
    .trim()
    .replace(/\s+/g, " ") // meerdere spaties -> 1
    .toLowerCase();
}

type Owner = { u: string; p: string };

function parseOwners(env?: string): Owner[] {
  if (!env) return [];
  return env
    .split(",")
    .map((pair) => pair.split(":"))
    .filter((x) => x.length === 2)
    .map(([u, p]) => ({ u: u.trim(), p: p.trim() }));
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

function isJa(v: unknown) {
  const x = norm(v);
  return x === "ja" || x === "true" || x === "1" || x === "yes";
}

export async function POST(req: NextRequest) {
  let usernameInput = "";
  let wachtwoord = "";

  try {
    const body = await req.json();
    usernameInput = clean(body?.username);
    wachtwoord = String(body?.wachtwoord ?? "");
  } catch {
    return NextResponse.json(
      { success: false, error: "Ongeldige invoer" },
      { status: 400 }
    );
  }

  if (!usernameInput || !wachtwoord) {
    return NextResponse.json(
      { success: false, error: "Username en wachtwoord verplicht" },
      { status: 400 }
    );
  }

  // ===========
  // EIGENAAR (via env)
  // ===========
  const owners = parseOwners(process.env.OWNERS);
  const owner = owners.find((o) => norm(o.u) === norm(usernameInput));

  if (owner) {
    const ok = await bcrypt.compare(wachtwoord, owner.p);
    if (!ok) {
      return NextResponse.json(
        { success: false, error: "DEBUG: eigenaar wachtwoord klopt niet" },
        { status: 401 }
      );
    }

    const token = await signSession({
      rol: "eigenaar",
      username: clean(owner.u),
      mustChangePassword: false,
    });

    const res = NextResponse.json({ success: true, rol: "eigenaar" });
    res.cookies.set(cookieName, token, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });
    return res;
  }

  // ===========
  // LID (Sheet)
  // ===========
  const sheetUrl = process.env.SHEET_URL;
  if (!sheetUrl) {
    return NextResponse.json(
      { success: false, error: "SHEET_URL ontbreekt" },
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
      { success: false, error: "Kon sheet niet ophalen" },
      { status: 500 }
    );
  }

  const lines = csv.trim().split("\n");
  const [, ...rows] = lines;

  const uNorm = norm(usernameInput);

  // O=14 username, P=15 hash, Q=16 mustChange
  const row = rows
    .map(parseCsvLine)
    .find((c) => norm(c[14]) === uNorm);

  if (!row) {
    return NextResponse.json(
      { success: false, error: "DEBUG: username niet gevonden in sheet (kolom O)" },
      { status: 401 }
    );
  }

  // Neem de username exact uit de sheet mee (voorkomt rare whitespace issues in sessie)
  const sheetUsername = clean(row[14]);

  const hash = clean(row[15]); // P
  if (!hash) {
    return NextResponse.json(
      { success: false, error: "Nog geen wachtwoord ingesteld" },
      { status: 403 }
    );
  }

  const ok = await bcrypt.compare(wachtwoord, hash);
  if (!ok) {
    return NextResponse.json(
      { success: false, error: "DEBUG: lid wachtwoord klopt niet (bcrypt compare fail)" },
      { status: 401 }
    );
  }

  const mustChangePassword = isJa(row[16]); // Q

  const token = await signSession({
    rol: "lid",
    username: sheetUsername,
    mustChangePassword,
  });

  const res = NextResponse.json({
    success: true,
    rol: "lid",
    mustChangePassword,
  });

  res.cookies.set(cookieName, token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  return res;
}
