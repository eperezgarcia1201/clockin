import type { Metadata } from "next";
import { IBM_Plex_Sans, Space_Grotesk } from "next/font/google";
import { Auth0Provider } from "@auth0/nextjs-auth0/client";
import "bootstrap/dist/css/bootstrap.min.css";
import "@fortawesome/fontawesome-free/css/all.min.css";
import "./globals.css";
import { auth0 } from "../lib/auth0";

const display = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-display",
});

const body = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-body",
});

export const metadata: Metadata = {
  title: "ClockIn",
  description: "Modern time clock for distributed teams.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const auth0Enabled = Boolean(
    process.env.NEXT_PUBLIC_AUTH0_DOMAIN &&
      process.env.NEXT_PUBLIC_AUTH0_CLIENT_ID,
  );
  let session = null;
  if (auth0Enabled && auth0) {
    try {
      session = await auth0.getSession();
    } catch {
      session = null;
    }
  }

  return (
    <html lang="en" className={`${display.variable} ${body.variable}`}>
      <body>
        {auth0Enabled ? (
          <Auth0Provider user={session?.user}>{children}</Auth0Provider>
        ) : (
          children
        )}
      </body>
    </html>
  );
}
