import { SignJWT, jwtVerify } from "jose";

export type Rol = "eigenaar" | "docent" | "gast";

const cookieName = "tda_session";

function secretKey() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET ontbreekt");
  return new TextEncoder().encode(secret);
}

export function getCookieName() {
  return cookieName;
}

export async function signSession(payload: { rol: Rol }) {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secretKey());
}

export async function verifySession(token: string) {
  const { payload } = await jwtVerify(token, secretKey());
  return payload as { rol?: Rol };
}
