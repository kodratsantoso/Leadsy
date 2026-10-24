import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host") || "";
  if (host.includes("leadsy.virtuenet.space") || host.includes("leadgen.virtuenet.space")) {
    const destination = new URL(request.nextUrl.pathname + request.nextUrl.search, "https://leadsy.tech");
    return NextResponse.redirect(destination, 301);
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
