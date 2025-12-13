
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { signSession, cookieName } from "@/lib/auth";

export const runtime = "nodejs";

function clean(s: unknown) {
  return String(s ?? "").trim();
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

export async function POST(req: NextRequest) {
  let username = "";
  let wachtwoord = "";

  try {
    const body = await req.json();
    username = clean(body?.username);
    wachtwoord = String(body?.wachtwoord ?? "");
  } catch {
    return NextResponse.json(
      { success: false, error: "Ongeldige invoer" },
      { status: 400 }
    );
  }

  if (!username || !wachtwoord) {
    return NextResponse.json(
      { success: false, error: "Username en wachtwoord verplicht" },
      { status: 400 }
    );
  }

  // ===========
  // EIGENAAR
  // ===========
  const owners = parseOwners(process.env.OWNERS);
  const owner = owners.find((o) => o.u === username);

  if (owner) {
    if (wachtwoord !== owner.p) {
      return NextResponse.json(
        { success: false, error: "Onjuiste inloggegevens" },
        { status: 401 }
      );
    }

    const token = await signSession({ rol: "eigenaar" });
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

  const r = await fetch(sheetUrl, { cache: "no-store" });
  if (!r.ok) {
    return NextResponse.json(
      { success: false, error: "Kon sheet niet ophalen" },
      { status: 500 }
    );
  }

  const csv = await r.text();
  const lines = csv.trim().split("\n");
  const [, ...rows] = lines;

  const row = rows
    .map((l) => l.split(","))
    .find((c) => clean(c[14]) === username); // kolom O

  if (!row) {
    return NextResponse.json(
      { success: false, error: "Onjuiste inloggegevens" },
      { status: 401 }
    );
  }

  const hash = clean(row[15]); // kolom P
  if (!hash) {
    return NextResponse.json(
      { success: false, error: "Nog geen wachtwoord ingesteld" },
      { status: 403 }
    );
  }

  const ok = await bcrypt.compare(wachtwoord, hash);
  if (!ok) {
    return NextResponse.json(
      { success: false, error: "Onjuiste inloggegevens" },
      { status: 401 }
    );
  }

  const token = await signSession({ rol: "lid" });
  const res = NextResponse.json({ success: true, rol: "lid" });

  res.cookies.set(cookieName, token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  return res;
}
