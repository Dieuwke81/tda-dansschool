
import { SignJWT, jwtVerify } from "jose";

export type Rol = "eigenaar" | "docent" | "gast" | "lid";

const COOKIE_NAME = "tda_session";
export const cookieName = COOKIE_NAME;

const secret = process.env.AUTH_SECRET;
if (!secret) {
  throw new Error("AUTH_SECRET ontbreekt (zet deze in Vercel)");
}
const key = new TextEncoder().encode(secret);

export type SessionPayload = {
  rol: Rol;
  username?: string; // ✅ nodig voor /mijn
};

export async function signSession(payload: SessionPayload) {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(key);
}

export async function verifySession(token: string) {
  const { payload } = await jwtVerify(token, key);
  return payload as SessionPayload;
}
