import { NextRequest, NextResponse } from "next/server";
import { ... } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const correct = process.env.LOGIN_PASSWORD;

  if (!correct) {
    return NextResponse.json(
      { success: false, error: "LOGIN_PASSWORD ontbreekt op de server" },
      { status: 500 }
    );
  }

  let wachtwoord = "";
  let rol: Rol = "gast";

  try {
    const body = await req.json();
    wachtwoord = String(body?.wachtwoord ?? "");
    rol = (body?.rol ?? "gast") as Rol;
  } catch {
    return NextResponse.json(
      { success: false, error: "Ongeldige request body" },
      { status: 400 }
    );
  }

  if (!["eigenaar", "docent", "gast"].includes(rol)) {
    return NextResponse.json(
      { success: false, error: "Ongeldige rol" },
      { status: 400 }
    );
  }

  if (wachtwoord !== correct) {
    return NextResponse.json(
      { success: false, error: "Onjuist wachtwoord" },
      { status: 401 }
    );
  }

  const token = await signSession({ rol });

  const res = NextResponse.json({ success: true });
  res.cookies.set(cookieName(), token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7
  });

  return res;
}
