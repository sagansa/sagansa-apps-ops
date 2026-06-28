import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

export default createMiddleware(routing);

export const config = {
  // Match all pathnames except for:
  // - /api and /backend-storage (backend proxy rewrites)
  // - Next.js internals (_next, _vercel)
  // - static files (with extensions)
  matcher: ["/((?!api|backend-storage|_next|_vercel|.*\\..*).*)"],
};
