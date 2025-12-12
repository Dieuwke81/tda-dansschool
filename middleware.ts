import { NextRequest, NextResponse } from "next/server";
import { ... } from "@/lib/auth";

function isAllowed(pathname: string, rol: Rol) {
  // Alleen eigenaar/docent mogen naar leden/lessen
  if (pathname.startsWith("/leden") || pathname.startsWith("/lessen")) {
    return rol === "eigenaar" || rol === "docent";
  }
  return true;
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Niet blokkeren: Next assets, api, login, bestanden
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname === "/login" ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/manifest") ||
    pathname.startsWith("/android-chrome") ||
    pathname.startsWith("/apple-touch-icon") ||
    pathname.startsWith("/og-image") ||
    pathname.startsWith("/robots.txt") ||
    pathname.startsWith("/sitemap.xml")
  ) {
    return NextResponse.next();
  }

  const token = req.cookies.get(cookieName())?.value;

  // Geen cookie → naar login
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
