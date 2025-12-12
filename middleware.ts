import { NextRequest, NextResponse } from "next/server";
import { verifySession, cookieName, type Rol } from "@/lib/auth";

function isAllowed(pathname: string, rol: Rol) {
  // Alleen eigenaar en docent mogen naar deze routes
  if (pathname.startsWith("/leden")) {
    return rol === "eigenaar" || rol === "docent";
  }

  // Alles anders is toegestaan
  return true;
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Login-pagina en api mogen altijd
  if (
    pathname.startsWith("/login") ||
    pathname.startsWith("/api")
  ) {
    return NextResponse.next();
  }

  const token = req.cookies.get(cookieName)?.value;

  // Niet ingelogd → naar login
  if (!token) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  try {
    const session = await verifySession(token);
    const rol = session.rol ?? "gast";

    if (!isAllowed(pathname, rol)) {
      return NextResponse.redirect(new URL("/", req.url));
    }

    return NextResponse.next();
  } catch {
    // Ongeldige token → uitloggen
    const res = NextResponse.redirect(new URL("/login", req.url));
    res.cookies.set(cookieName, "", { path: "/", maxAge: 0 });
    return res;
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
