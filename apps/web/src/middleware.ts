import { authMiddleware } from "./lib/auth0";

export default authMiddleware;

export const config = {
  matcher: ["/auth/:path*", "/admin/:path*", "/reports/:path*"],
};
