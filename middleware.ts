import { NextRequest, NextResponse } from "next/server";
import { verifySession, getCookieName, type Rol } from "@/lib/auth";

function isAllowed(pathname: string, rol: Rol) {
  // Alleen eigenaar/docent mogen naar leden/lessen
  if (pathname.startsWith("/leden") || pathname.startsWith("/lessen")) {
    return rol === "eigenaar" || rol === "docent";
  }
  return true;
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // niet blokkeren: assets, api, login
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/favicon") ||
    pathname === "/login"
  ) {
    return NextResponse.next();
  }

  const token = req.cookies.get(getCookieName())?.value;
  if (!token) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  try {
    const payload = await verifySession(token);
    const rol = (payload.rol ?? "gast") as Rol;

    if (!isAllowed(pathname, rol)) {
      const url = req.nextUrl.clone();
      url.pathname = "/login";
      return NextResponse.redirect(url);
    }

    return NextResponse.next();
  } catch {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
