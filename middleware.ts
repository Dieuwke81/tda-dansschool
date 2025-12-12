import { NextRequest, NextResponse } from "next/server";
import { verifySession, cookieName, type Rol } from "@/lib/auth";

function isAllowed(pathname: string, rol: Rol) {
  // Alleen eigenaar/docent mogen naar leden/lessen
  if (pathname.startsWith("/leden") || pathname.startsWith("/lessen")) {
    return rol === "eigenaar" || rol === "docent";
  }

  // Alleen eigenaar mag naar /hash (hash-maker)
  if (pathname.startsWith("/hash")) {
    return rol === "eigenaar";
  }

  // Alles andere mag (bijv. /, /login wordt al apart afgehandeld)
  return true;
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Altijd toegestaan (anders breekt Next / assets / api)
  if (
    pathname.startsWith("/login") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico" ||
    pathname === "/manifest.json" ||
    pathname.startsWith("/android-chrome") ||
    pathname.startsWith("/apple-touch-icon") ||
    pathname.startsWith("/icons") ||
    pathname.endsWith(".png") ||
    pathname.endsWith(".svg") ||
    pathname.endsWith(".jpg") ||
    pathname.endsWith(".jpeg") ||
    pathname.endsWith(".webp") ||
    pathname.endsWith(".ico")
  ) {
    return NextResponse.next();
  }

  const token = req.cookies.get(cookieName)?.value;

  if (!token) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  try {
    const session = await verifySession(token);
    const rol: Rol = (session.rol ?? "gast") as Rol;

    if (!isAllowed(pathname, rol)) {
      return NextResponse.redirect(new URL("/", req.url));
    }

    return NextResponse.next();
  } catch {
    const res = NextResponse.redirect(new URL("/login", req.url));
    res.cookies.set(cookieName, "", { path: "/", maxAge: 0 });
    return res;
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
