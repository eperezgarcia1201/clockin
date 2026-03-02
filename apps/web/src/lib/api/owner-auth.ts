type OwnerLoginInput = {
  username: string;
  password: string;
};

export function loginOwnerRequest(input: OwnerLoginInput): Promise<Response> {
  return fetch("/api/owner/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
}
