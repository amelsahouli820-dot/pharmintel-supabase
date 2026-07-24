import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const cookieName = "pharmintel_session";
const publicPaths = ["/connexion", "/inscription", "/mot-de-passe-oublie", "/identifiant-oublie", "/aide", "/reinitialiser", "/api/auth/login", "/api/auth/register", "/api/auth/recovery/", "/api/auth/support", "/api/health", "/api/public/", "/manifest.webmanifest", "/sw.js", "/icons/"];

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  if (publicPaths.some(p => path === p || path.startsWith(p))) return NextResponse.next();
  const token = request.cookies.get(cookieName)?.value;
  if (!token) return path.startsWith("/api/") ? NextResponse.json({ error: "Authentification requise." }, { status: 401 }) : NextResponse.redirect(new URL("/connexion", request.url));
  try {
    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error("Secret absent");
    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret));
    if (payload.mustChangePassword && path !== "/mot-de-passe" && !path.startsWith("/api/auth/")) return NextResponse.redirect(new URL("/mot-de-passe", request.url));
    return NextResponse.next();
  } catch {
    const response = path.startsWith("/api/") ? NextResponse.json({ error: "Session expirée." }, { status: 401 }) : NextResponse.redirect(new URL("/connexion", request.url));
    response.cookies.delete(cookieName);
    return response;
  }
}

export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico|logo.svg).*)"] };
