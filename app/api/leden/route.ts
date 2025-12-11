import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  // Wat de gebruiker invoert op het loginformulier
  const body = await req.json();
  const wachtwoord = body.wachtwoord as string | undefined;

  // Het geheime wachtwoord uit Vercel
  const correct = process.env.LOGIN_PASSWORD;

  if (!correct) {
    // Server is niet goed ingesteld
    return NextResponse.json(
      { success: false, error: "Server-misconfiguratie" },
      { status: 500 }
    );
  }

  if (!wachtwoord || wachtwoord !== correct) {
    // Fout wachtwoord
    return NextResponse.json(
      { success: false, error: "Onjuist wachtwoord" },
      { status: 401 }
    );
  }

  // Goed wachtwoord
  return NextResponse.json({ success: true });
}
