import { SignJWT, jwtVerify } from "jose";

export type Rol = "eigenaar" | "docent" | "gast";

const COOKIE_NAME = "tda_session";

function getSecretKey() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error("AUTH_SECRET ontbreekt (zet deze in Vercel Environment Variables)");
  }
  return new TextEncoder().encode(secret);
}

export function cookieName() {
  return COOKIE_NAME;
}

export async function signSession(payload: { rol: Rol }) {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getSecretKey());
}

export async function verifySession(token: string) {
  const { payload } = await jwtVerify(token, getSecretKey());
  return payload as { rol?: Rol };
}
