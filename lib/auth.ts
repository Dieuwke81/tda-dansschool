import { SignJWT, jwtVerify } from "jose";

export type Rol = "eigenaar" | "docent" | "gast" | "lid";

const COOKIE_NAME = "tda_session";

function getSecretKey() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error("AUTH_SECRET ontbreekt (zet deze in Vercel)");
  }
  return new TextEncoder().encode(secret);
}

export const cookieName = COOKIE_NAME;

export type SessionPayload = {
  rol: Rol;
  username?: string; // voor leden
};

export async function signSession(payload: SessionPayload) {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getSecretKey());
}

export async function verifySession(token: string) {
  const { payload } = await jwtVerify(token, getSecretKey());
  return payload as SessionPayload;
}
