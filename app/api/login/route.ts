
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { signSession, cookieName } from "@/lib/auth";

export const runtime = "nodejs";

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

// normaliseer header namen (spaties/case stabiel)
function h(s: unknown) {
  return clean(s).toLowerCase().replace(/\s+/g, " ");
}

type Owner = { u: string; p: string };
type Docent = { u: string; p: string };

function parseOwners(env?: string): Owner[] {
  if (!env) return [];
  return env
    .split(",")
    .map((pair) => pair.split(":"))
    .filter((x) => x.length === 2)
    .map(([u, p]) => ({ u: u.trim(), p: p.trim() }))
    .filter((x) => x.u && x.p);
}

function parseDocents(env?: string): Docent[] {
  if (!env) return [];
  return env
    .split(",")
    .map((pair) => pair.split(":"))
    .filter((x) => x.length === 2)
    .map(([u, p]) => ({ u: u.trim(), p: p.trim() }))
    .filter((x) => x.u && x.p);
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

function idx(map: Record<string, number>, headerName: string) {
  const i = map[h(headerName)];
  return typeof i === "number" ? i : -1;
}

export async function POST(req: NextRequest) {
  let usernameInput = "";
  let wachtwoord = "";

  try {
    const body = await req.json();
    usernameInput = clean(body?.username);
    wachtwoord = String(body?.wachtwoord ?? "");
  } catch {
    return NextResponse.json({ success: false, error: "Ongeldige invoer" }, { status: 400 });
  }

  if (!usernameInput || !wachtwoord) {
    return NextResponse.json(
      { success: false, error: "Username en wachtwoord verplicht" },
      { status: 400 }
    );
  }

  // ===========
  // EIGENAAR (via env) - verwacht bcrypt hash in env
  // OWNERS="Dieuwke:<bcryptHash>,Tatjana:<bcryptHash>"
  // ===========
  const owners = parseOwners(process.env.OWNERS);
  const owner = owners.find((o) => norm(o.u) === norm(usernameInput));

  if (owner) {
    const ok = await bcrypt.compare(wachtwoord, owner.p);
    if (!ok) {
      return NextResponse.json({ success: false, error: "Onjuiste inloggegevens" }, { status: 401 });
    }

    const token = await signSession({
      rol: "eigenaar",
      username: clean(owner.u),
      mustChangePassword: false,
    });

    const res = NextResponse.json({ success: true, rol: "eigenaar", mustChangePassword: false });
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
  // DOCENT (via env) - verwacht bcrypt hash in env
  // DOCENTS="Tatjana:<bcryptHash>,Dieuwke:<bcryptHash>"
  // ===========
  const docents = parseDocents(process.env.DOCENTS);
  const docent = docents.find((d) => norm(d.u) === norm(usernameInput));

  if (docent) {
    const ok = await bcrypt.compare(wachtwoord, docent.p);
    if (!ok) {
      return NextResponse.json({ success: false, error: "Onjuiste inloggegevens" }, { status: 401 });
    }

    const token = await signSession({
      rol: "docent",
      username: clean(docent.u),
      mustChangePassword: false,
    });

    const res = NextResponse.json({ success: true, rol: "docent", mustChangePassword: false });
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
    return NextResponse.json({ success: false, error: "SHEET_URL ontbreekt" }, { status: 500 });
  }

  let csv = "";
  try {
    const r = await fetch(sheetUrl, { cache: "no-store" });
    if (!r.ok) throw new Error("Sheet niet bereikbaar");
    csv = await r.text();
  } catch {
    return NextResponse.json({ success: false, error: "Kon sheet niet ophalen" }, { status: 500 });
  }

  const lines = csv.trim().split("\n");
  if (lines.length < 2) {
    return NextResponse.json({ success: false, error: "Sheet is leeg" }, { status: 500 });
  }

  const header = parseCsvLine(lines[0]);
  const map: Record<string, number> = {};
  header.forEach((name, i) => {
    map[h(name)] = i;
  });

  const iUsername = idx(map, "username");
  const iHash = idx(map, "password_hash");
  const iMust = idx(map, "moet_wachtwoord_wijzigen");

  if (iUsername === -1 || iHash === -1 || iMust === -1) {
    return NextResponse.json(
      { success: false, error: "Sheet kolommen missen (username/password_hash/moet_wachtwoord_wijzigen)" },
      { status: 500 }
    );
  }

  const uNorm = norm(usernameInput);
  const rows = lines.slice(1);
  const row = rows.map(parseCsvLine).find((c) => norm(c[iUsername]) === uNorm);

  if (!row) {
    return NextResponse.json({ success: false, error: "Onjuiste inloggegevens" }, { status: 401 });
  }

  const sheetUsername = clean(row[iUsername]);
  const hash = clean(row[iHash]);

  if (!hash) {
    return NextResponse.json({ success: false, error: "Nog geen wachtwoord ingesteld" }, { status: 403 });
  }

  const ok = await bcrypt.compare(wachtwoord, hash);
  if (!ok) {
    return NextResponse.json({ success: false, error: "Onjuiste inloggegevens" }, { status: 401 });
  }

  const mustChangePassword = isJa(row[iMust]);

  const token = await signSession({
    rol: "lid",
    username: sheetUsername,
    mustChangePassword,
  });

  const res = NextResponse.json({ success: true, rol: "lid", mustChangePassword });

  res.cookies.set(cookieName, token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  return res;
}
