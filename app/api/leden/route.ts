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
        { status: 502 }
      );
    }

    const text = await res.text();

    // We sturen de CSV gewoon door, net als de originele URL deed
    return new Response(text, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
      },
    });
  } catch (err) {
    console.error("Fout bij ophalen sheet:", err);
    return NextResponse.json(
      { error: "Interne serverfout bij het ophalen van de leden" },
      { status: 500 }
    );
  }
}
