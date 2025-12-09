// app/api/leden/route.ts
import { NextResponse } from "next/server";

const SHEET_URL = process.env.SHEET_URL;

export async function GET() {
  if (!SHEET_URL) {
    return NextResponse.json(
      { error: "SHEET_URL ontbreekt op de server" },
      { status: 500 }
    );
  }

  try {
    // Haal de CSV op van Google Sheets
    const res = await fetch(SHEET_URL);

    if (!res.ok) {
      return NextResponse.json(
        { error: "Kon de sheet niet ophalen" },
        { status: 500 }
      );
    }

    const text = await res.text();

    // Geef de CSV door aan de frontend
    return new Response(text, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
      },
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Interne serverfout" },
      { status: 500 }
    );
  }
}
