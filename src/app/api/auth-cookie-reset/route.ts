import { NextResponse } from "next/server";

function expiredCookie(name: string): string {
  return `${name}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax`;
}

export function POST(): NextResponse {
  const res = new NextResponse(null, { status: 204 });
  res.headers.append("Set-Cookie", expiredCookie("session"));
  res.headers.append("Set-Cookie", expiredCookie("x-csrf-token"));
  return res;
}
