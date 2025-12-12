import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const correct = process.env.LOGIN_PASSWORD;

  if (!correct) {
    return NextResponse.json(
      { success: false, error: "LOGIN_PASSWORD ontbreekt op de server" },
      { status: 500 }
    );
  }

  const body = await req.json().catch(() => null);
  const wachtwoord = String(body?.wachtwoord ?? "");

  if (wachtwoord !== correct) {
    return NextResponse.json(
      { success: false, error: "Onjuist wachtwoord" },
      { status: 401 }
    );
  }

  return NextResponse.json({ success: true });
}
