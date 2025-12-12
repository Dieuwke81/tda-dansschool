
// 1) Eigenaar-logins via ENV (OWNERS="user:pass,user2:pass2")
const ownersRaw = String(process.env.OWNERS ?? "").trim();

if (ownersRaw) {
  const owners = ownersRaw
    .split(",")
    .map((pair) => pair.trim())
    .filter(Boolean)
    .map((pair) => {
      const [u, ...rest] = pair.split(":");
      return { u: clean(u), p: rest.join(":") }; // wachtwoord mag : bevatten
    });

  const owner = owners.find((o) => o.u && o.u === username);

  if (owner) {
    if (wachtwoord !== owner.p) {
      return NextResponse.json(
        { success: false, error: "Onjuiste inloggegevens" },
        { status: 401 }
      );
    }

    const token = await signSession({ rol: "eigenaar" as any });
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
}

// (optioneel) oude single-owner fallback mag weg of laten staan
