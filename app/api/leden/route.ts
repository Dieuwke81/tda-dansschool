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
    const res = await fetch(sheetUrl, { cache: "no-store" });
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
  } catch (e) {
    return NextResponse.json(
      { error: "Er ging iets mis bij het ophalen van de sheet" },
      { status: 500 }
    );
  }
}
