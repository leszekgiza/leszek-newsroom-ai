import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getMiddlewareAction } from "./middleware-utils";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionToken = request.cookies.get("session")?.value ?? null;
  const acceptLanguage = request.headers.get("accept-language");

  const action = await getMiddlewareAction(
    pathname,
    sessionToken,
    acceptLanguage
  );

  switch (action.type) {
    case "redirect": {
      const url = request.nextUrl.clone();
      url.pathname = action.url;
      return NextResponse.redirect(url, 301);
    }
    case "passthrough":
    default:
      return NextResponse.next();
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico
     * - icons/
     * - manifest.webmanifest
     * - sw.js
     */
    "/((?!_next/static|_next/image|favicon\\.ico|icons/|manifest\\.webmanifest|sw\\.js|robots\\.txt|sitemap\\.xml|llms\\.txt|llms-full\\.txt).*)",
  ],
};
