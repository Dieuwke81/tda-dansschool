
import { NextRequest, NextResponse } from "next/server";
import { verifySession, cookieName, type Rol } from "@/lib/auth";

type SessionLike = {
  rol?: Rol;
  mustChangePassword?: boolean;
};

function isAllowed(pathname: string, rol: Rol, mustChangePassword: boolean) {
  // Publiek
  if (pathname.startsWith("/login")) return true;

  // ✅ Wachtwoord-route moet bereikbaar zijn (vooral voor lid)
  if (pathname.startsWith("/wachtwoord")) {
    // lid mag altijd naar /wachtwoord, maar als mustChangePassword=false sturen we later door naar /mijn
    return true;
  }

  // Alleen eigenaar/docent mogen naar leden/lessen
  if (pathname.startsWith("/leden") || pathname.startsWith("/lessen")) {
    return rol === "eigenaar" || rol === "docent";
  }

  // Alleen eigenaar mag naar /hash
  if (pathname.startsWith("/hash")) {
    return rol === "eigenaar";
  }

  // ✅ Lid regels
  if (rol === "lid") {
    // Als lid MOET wijzigen: alleen /wachtwoord (plus / of /mijn mag je desnoods ook blokkeren)
    // We blokkeren hier alles behalve / en /mijn niet direct, want we sturen in middleware naar /wachtwoord
    if (mustChangePassword) {
      return false; // alles behalve /wachtwoord wordt geweigerd -> redirect naar /wachtwoord
    }

    // Lid hoeft niet te wijzigen -> mag / en /mijn
    return pathname === "/" || pathname.startsWith("/mijn");
  }

  // Overig: eigenaar/docent/gast mogen de rest
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
    const res = NextResponse.next();
    res.headers.set("x-pathname", pathname);
    return res;
  }

  const token = req.cookies.get(cookieName)?.value;

  if (!token) {
    const res = NextResponse.redirect(new URL("/login", req.url));
    res.headers.set("x-pathname", pathname);
    return res;
  }

  try {
    const session = (await verifySession(token)) as unknown as SessionLike;

    const rol: Rol = (session.rol ?? "gast") as Rol;
    const mustChangePassword = session.mustChangePassword === true;

    // ✅ Extra: als lid NIET meer hoeft te wijzigen maar toch naar /wachtwoord gaat -> naar /mijn
    if (rol === "lid" && !mustChangePassword && pathname.startsWith("/wachtwoord")) {
      const res = NextResponse.redirect(new URL("/mijn", req.url));
      res.headers.set("x-pathname", pathname);
      return res;
    }

    // ✅ Als lid WEL moet wijzigen:
    // - alles behalve /wachtwoord -> naar /wachtwoord
    if (rol === "lid" && mustChangePassword && !pathname.startsWith("/wachtwoord")) {
      const res = NextResponse.redirect(new URL("/wachtwoord", req.url));
      res.headers.set("x-pathname", pathname);
      return res;
    }

    // Normale toegang check
    if (!isAllowed(pathname, rol, mustChangePassword)) {
      // lid die ergens anders heen gaat -> naar /mijn (maar mustChangePassword=true is hierboven al afgevangen)
      if (rol === "lid") {
        const res = NextResponse.redirect(new URL("/mijn", req.url));
        res.headers.set("x-pathname", pathname);
        return res;
      }

      const res = NextResponse.redirect(new URL("/", req.url));
      res.headers.set("x-pathname", pathname);
      return res;
    }

    const res = NextResponse.next();
    res.headers.set("x-pathname", pathname);
    return res;
  } catch {
    const res = NextResponse.redirect(new URL("/login", req.url));
    res.cookies.set(cookieName, "", { path: "/", maxAge: 0 });
    res.headers.set("x-pathname", pathname);
    return res;
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
