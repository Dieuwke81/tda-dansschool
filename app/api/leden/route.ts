import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const sheetUrl = process.env.SHEET_URL;
  const serverKey = process.env.SHEET_KEY;

  if (!sheetUrl) {
    return NextResponse.json(
      { error: "SHEET_URL ontbreekt op de server" },
      { status: 500 }
    );
  }

  if (!serverKey) {
    return NextResponse.json(
      { error: "SHEET_KEY ontbreekt op de server" },
      { status: 500 }
    );
  }

  // 🔐 controleer geheime sleutel uit header
  const clientKey = request.headers.get("x-sheet-key");
  if (clientKey !== serverKey) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const res = await fetch(sheetUrl);
    if (!res.ok) {
      return NextResponse.json(
        { error: "Kon de Google Sheet niet ophalen" },
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
      { error: "Er ging iets mis bij het ophalen van de sheet" },
      { status: 500 }
    );
  }
}
