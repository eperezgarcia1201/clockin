import { Auth0Client } from "@auth0/nextjs-auth0/server";
import { NextResponse, type NextRequest } from "next/server";

export const authConfigured = Boolean(
  process.env.AUTH0_DOMAIN &&
    process.env.AUTH0_CLIENT_ID &&
    process.env.AUTH0_CLIENT_SECRET &&
    process.env.AUTH0_SECRET &&
    process.env.APP_BASE_URL,
);

export const auth0 = authConfigured
  ? new Auth0Client({
      authorizationParameters: {
        audience: process.env.AUTH0_AUDIENCE,
        organization: process.env.AUTH0_ORG_ID,
      },
    })
  : null;

export const authMiddleware = authConfigured && auth0
  ? auth0.middleware
  : (_req: NextRequest) => NextResponse.next();
