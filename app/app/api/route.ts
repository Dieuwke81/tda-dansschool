import { NextResponse } from "next/server";

const SHEET_URL = process.env.GOOGLE_SHEET_CSV_URL;

export async function GET() {
  if (!SHEET_URL) {
    return NextResponse.json(
      { error: "Geen Google Sheet URL ingesteld" },
      { status: 500 }
    );
  }

  try {
    const res = await fetch(SHEET_URL, { cache: "no-store" });

    if (!res.ok) {
      return NextResponse.json(
        { error: "Kon Google Sheet niet ophalen" },
        { status: 500 }
      );
    }

    const text = await res.text();

    return new NextResponse(text, {
      headers: {
        "Content-Type": "text/csv",
      },
    });
  } catch (err) {
    return NextResponse.json(
      { error: "Serverfout bij ophalen leden" },
      { status: 500 }
    );
  }
}
