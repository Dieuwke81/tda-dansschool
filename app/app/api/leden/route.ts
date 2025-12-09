import { NextResponse } from "next/server";

export async function GET() {
  const sheetUrl = process.env.SHEET_URL;

  if (!sheetUrl) {
    return NextResponse.json(
      { error: "SHEET_URL ontbreekt op de server" },
      { status: 500 }
    );
  }

  try {
    const res = await fetch(sheetUrl);

    if (!res.ok) {
      return NextResponse.json(
        { error: "Kon de Google Sheet niet ophalen" },
        { status: res.status }
      );
    }

    const text = await res.text();

    // We geven de CSV gewoon door aan de frontend
    return new NextResponse(text, {
      status: 200,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
      },
    });
  } catch (err) {
    console.error("Fout bij ophalen sheet:", err);
    return NextResponse.json(
      { error: "Interne serverfout bij ophalen sheet" },
      { status: 500 }
    );
  }
}
