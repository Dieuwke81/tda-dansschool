import { NextRequest, NextResponse } from "next/server";
import { verifySession, cookieName, type Rol } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const sheetUrl = process.env.SHEET_URL;

  if (!sheetUrl) {
    return NextResponse.json(
      { error: "SHEET_URL ontbreekt op de server" },
      { status: 500 }
    );
  }

  /* ===============================
     1️⃣ Check: sessie-cookie
  =============================== */
  const token = req.cookies.get(cookieName)?.value;

  if (!token) {
    return NextResponse.json(
      { error: "Niet ingelogd" },
      { status: 401 }
    );
  }

  /* ===============================
     2️⃣ Check: JWT geldig + rol
  =============================== */
  let rol: Rol | undefined;

  try {
    const session = await verifySession(token);
    rol = session.rol;
  } catch {
    return NextResponse.json(
      { error: "Ongeldige sessie" },
      { status: 401 }
    );
  }

  if (rol !== "eigenaar" && rol !== "docent") {
    return NextResponse.json(
      { error: "Geen toegang tot leden" },
      { status: 403 }
    );
  }

  /* ===============================
     3️⃣ Data ophalen
  =============================== */
  try {
    const res = await fetch(sheetUrl, { cache: "no-store" });

    if (!res.ok) {
      return NextResponse.json(
        { error: "Kon Google Sheet niet ophalen" },
        { status: 500 }
      );
    }

    const csv = await res.text();

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
      },
    });
  } catch (error) {
    console.error("Fout bij ophalen sheet:", error);
    return NextResponse.json(
      { error: "Serverfout bij ophalen leden" },
      { status: 500 }
    );
  }
}
