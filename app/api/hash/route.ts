import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { verifySession, cookieName, type Rol } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  // 1) Alleen eigenaar mag hashes maken
  const token = req.cookies.get(cookieName())?.value;
  if (!token) {
    return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  }

  let rol: Rol = "gast";
  try {
    const session = await verifySession(token);
    rol = (session.rol ?? "gast") as Rol;
  } catch {
    return NextResponse.json({ error: "Ongeldige sessie" }, { status: 401 });
  }

  if (rol !== "eigenaar") {
    return NextResponse.json({ error: "Geen rechten" }, { status: 403 });
  }

  // 2) Lees wachtwoord uit request
  let password = "";
  try {
    const body = await req.json();
    password = String(body?.password ?? "");
  } catch {
    return NextResponse.json({ error: "Ongeldige body" }, { status: 400 });
  }

  if (password.length < 8) {
    return NextResponse.json(
      { error: "Wachtwoord moet minimaal 8 tekens zijn" },
      { status: 400 }
    );
  }

  // 3) Maak hash
  const hash = await bcrypt.hash(password, 10);

  return NextResponse.json({ hash });
}
