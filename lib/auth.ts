import { SignJWT, jwtVerify } from "jose";

export type Rol = "eigenaar" | "docent" | "gast" | "lid";

export const cookieName = "tda_session";

function getKey() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error("AUTH_SECRET ontbreekt (zet deze in Vercel)");
  }
  return new TextEncoder().encode(secret);
}

export async function signSession(payload: { rol: Rol }) {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getKey());
}

export async function verifySession(token: string) {
  const { payload } = await jwtVerify(token, getKey());
  return payload as { rol?: Rol };
}
