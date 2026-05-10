// proxy.ts (Next.js 16's renamed middleware.ts)
import { NextRequest, NextResponse } from "next/server";

// Better Auth issues different cookie names depending on the connection:
//   - HTTP (localhost dev):     better-auth.session_token
//   - HTTPS (production):       __Secure-better-auth.session_token
// Check both so the proxy works in both environments.
const SESSION_COOKIE_NAMES = [
  "better-auth.session_token",
  "__Secure-better-auth.session_token",
];

export default function proxy(request: NextRequest) {
  const hasSession = SESSION_COOKIE_NAMES.some(
    (name) => request.cookies.get(name)?.value,
  );

  if (!hasSession) {
    return NextResponse.redirect(new URL("/auth/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  /*
   * Match every path EXCEPT:
   *   - "/" (landing page)            — the trailing `.+` excludes the bare /
   *   - "/auth/*"                     — login & sign-up must be reachable signed out
   *   - "/api/*"                      — each API route does its own auth
   *   - "/_next/*"                    — every Next internal (static, image, data, hmr)
   *   - "/favicon.ico"                — top-level favicon
   *   - "/privacy-policy"             — legal pages must be reachable signed out
   *   - "/terms-of-use"               — legal pages must be reachable signed out
   *   - any path with a file extension (`.png`, `.woff`, `.txt`, etc.) — covers
   *                                     everything served from /public/ so the
   *                                     landing page's logos / fonts / robots
   *                                     don't get redirected to login.
   *
   * Trailing-slash on "auth/" and "api/" anchors to a real path segment, so a
   * future route called "/authorization" wouldn't accidentally bypass the gate.
   * The legal pages are matched as full path segments (anchored with `$` or
   * a trailing `/`) so a future route like "/privacy-policy-archive" would
   * still be gated.
   */
  matcher: [
    "/((?!auth/|api/|_next/|favicon\\.ico|privacy-policy(?:/|$)|terms-of-use(?:/|$)|.*\\.[a-zA-Z0-9]+$).+)",
  ],
};
