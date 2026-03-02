type AdminLoginInput = {
  tenant: string;
  username: string;
  password: string;
};

type AdminForgotPasswordInput = {
  email: string;
};

export function loginAdminRequest(input: AdminLoginInput): Promise<Response> {
  return fetch("/api/admin/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
}

export function fetchAdminAccessRequest(): Promise<Response> {
  return fetch("/api/access/me", { cache: "no-store" });
}

export function fetchAdminOfficesRequest(): Promise<Response> {
  return fetch("/api/offices", { cache: "no-store" });
}

export function sendAdminForgotPasswordRequest(
  input: AdminForgotPasswordInput,
): Promise<Response> {
  return fetch("/api/admin/forgot-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
}

export function logoutAdminRequest(): Promise<Response> {
  return fetch("/api/admin/logout", { method: "POST" });
}
