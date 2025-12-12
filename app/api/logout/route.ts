import { NextResponse } from "next/server";
import { ... } from "@/lib/auth";

export async function POST() {
  const res = NextResponse.json({ success: true });
  res.cookies.set(cookieName(), "", { path: "/", maxAge: 0 });
  return res;
}
