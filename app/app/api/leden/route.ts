// app/app/api/leden/route.ts
import { NextResponse } from "next/server";

const SHEET_CSV_URL =
  "https://docs.google.com/spreadsheets/d/1xkDxiNuefHzYB__KPai0M5bXWIURporgFvKmnKTxAr4/export?format=csv&gid=0";

export async function GET(request: Request) {
  const clientKeyHeader = request.headers.get("x-client-key");
  const clientKeyEnv = process.env.CLIENT_KEY;

  if (!clientKeyEnv || clientKeyHeader !== clientKeyEnv) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const res = await fetch(SHEET_CSV_URL);

    if (!res.ok) {
      return NextResponse.json(
        { error: "Kon de ledenlijst niet ophalen" },
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
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Interne serverfout bij het ophalen van de sheet" },
      { status: 500 }
    );
  }
}
