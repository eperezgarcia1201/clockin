"use client";

import { useUser } from "@auth0/nextjs-auth0/client";

function AuthActionsInner({ showSignIn }: { showSignIn: boolean }) {
  const { user, isLoading } = useUser();

  if (isLoading) {
    return showSignIn ? <span className="auth-status">Loading session…</span> : null;
  }

  if (!user) {
    if (!showSignIn) {
      return null;
    }
    return (
      <a className="button primary" href="/auth/login">
        Sign in with SSO
      </a>
    );
  }

  return (
    <div className="auth-row">
      <span className="auth-status">
        Signed in as {user.name || user.email}
      </span>
      <a className="button ghost" href="/auth/logout">
        Sign out
      </a>
    </div>
  );
}

export function AuthActions({ showSignIn = true }: { showSignIn?: boolean }) {
  const enabled =
    Boolean(process.env.NEXT_PUBLIC_AUTH0_DOMAIN) &&
    Boolean(process.env.NEXT_PUBLIC_AUTH0_CLIENT_ID);

  if (!enabled) {
    return showSignIn ? <span className="button primary is-disabled">Sign in with SSO</span> : null;
  }

  return <AuthActionsInner showSignIn={showSignIn} />;
}
