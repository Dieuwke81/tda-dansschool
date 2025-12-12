import { NextRequest, NextResponse } from "next/server";
import { verifySession, cookieName } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const token = req.cookies.get(cookieName)?.value;

  if (!token) {
    return NextResponse.json({ loggedIn: false }, { status: 200 });
  }

  try {
    const session = await verifySession(token);
    return NextResponse.json(
      { loggedIn: true, rol: session.rol ?? "gast", username: session.username },
      { status: 200 }
    );
  } catch {
    const res = NextResponse.json({ loggedIn: false }, { status: 200 });
    res.cookies.set(cookieName, "", { path: "/", maxAge: 0 });
    return res;
  }
}
