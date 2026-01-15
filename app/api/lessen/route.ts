import { NextRequest, NextResponse } from "next/server";
import { verifySession, cookieName, type Rol } from "@/lib/auth";

export const runtime = "nodejs";

// Helper om CSV op te halen (exact zoals in je leden route)
async function fetchCsv(url: string, label: string) {
  const r = await fetch(url, { cache: "no-store" });
  if (!r.ok) throw new Error(`${label} niet bereikbaar (status ${r.status})`);
  return await r.text();
}

export async function GET(req: NextRequest) {
  const lessenUrl = process.env.SHEET_LESSEN_URL;

  if (!lessenUrl) {
    return NextResponse.json(
      { error: "SHEET_LESSEN_URL ontbreekt op de server" },
      { status: 500 }
    );
  }

  // 1) Inlog check
  const token = req.cookies.get(cookieName)?.value;
  if (!token) {
    return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  }

  // 2) Sessie & Rol check
  try {
    const session: any = await verifySession(token);
    const rol = session.rol as Rol;

    // Alleen eigenaar en docent mogen de financiële kant/lesoverzichten zien
    if (rol !== "eigenaar" && rol !== "docent") {
      return NextResponse.json({ error: "Geen toegang" }, { status: 403 });
    }
  } catch {
    return NextResponse.json({ error: "Ongeldige sessie" }, { status: 401 });
  }

  // 3) Lessen CSV ophalen uit Google Sheets
  try {
    const csv = await fetchCsv(lessenUrl, "Lessen-sheet");
    return new NextResponse(csv, {
      status: 200,
      headers: { "Content-Type": "text/csv; charset=utf-8" },
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Kon Google Sheet (Lessen) niet ophalen" },
      { status: 500 }
    );
  }
}
