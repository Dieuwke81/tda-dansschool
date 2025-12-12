import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const correct = process.env.LOGIN_PASSWORD;

  if (!correct) {
    return NextResponse.json(
      { success: false, error: "LOGIN_PASSWORD ontbreekt op de server" },
      { status: 500 }
    );
  }

  let wachtwoord = "";
  try {
    const body = await req.json();
    wachtwoord = String(body?.wachtwoord ?? "");
  } catch {
    return NextResponse.json(
      { success: false, error: "Ongeldige request body" },
      { status: 400 }
    );
  }

  if (wachtwoord !== correct) {
    return NextResponse.json(
      { success: false, error: "Onjuist wachtwoord" },
      { status: 401 }
    );
  }

  return NextResponse.json({ success: true });
}
