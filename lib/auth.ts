import { NextRequest, NextResponse } from "next/server";
import { verifySession, cookieName, type Rol } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const token = req.cookies.get(cookieName)?.value;

  if (!token) {
    return NextResponse.json({ loggedIn: false }, { status: 200 });
  }

  try {
    const session = await verifySession(token);

    const rol: Rol =
      (session.rol as Rol | undefined) ?? ("lid" as Rol);

    return NextResponse.json(
      { loggedIn: true, rol },
      { status: 200 }
    );
  } catch {
    // Cookie ongeldig -> als "uitgelogd" behandelen
    const res = NextResponse.json({ loggedIn: false }, { status: 200 });
    res.cookies.set(cookieName, "", { path: "/", maxAge: 0 });
    return res;
  }
}
