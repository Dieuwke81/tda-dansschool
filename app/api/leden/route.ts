import { NextResponse } from "next/server";

export async function GET() {
  // Haal de URL van je Google Sheet uit de server-omgeving
  const sheetUrl = process.env.SHEET_URL;

  if (!sheetUrl) {
    return NextResponse.json(
      { error: "SHEET_URL ontbreekt op de server" },
      { status: 500 }
    );
  }

  try {
    const res = await fetch(sheetUrl, {
      // je Sheet geeft CSV terug
      cache: "no-store",
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: "Kon Google Sheet niet ophalen" },
        { status: 500 }
      );
    }

    const csv = await res.text();

    return new Response(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
      },
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Onbekende fout bij ophalen van de sheet" },
      { status: 500 }
    );
  }
}
