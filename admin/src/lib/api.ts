// En production, l'API BOLIGO sur Render ; en local, l'API lancée sur le port 3000.
// Une variable vide est ignorée (sinon les appels partiraient vers le site lui-même).
const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  (process.env.NODE_ENV === "production"
    ? "https://boligo-back.onrender.com/api"
    : "http://localhost:3000/api");

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit & { token?: string | null } = {},
): Promise<T> {
  const { token, ...init } = options;
  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const res = await fetch(`${API_URL}${path}`, { ...init, headers });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(
      (body as { message?: string }).message ?? res.statusText,
      res.status,
    );
  }
  return res.json() as Promise<T>;
}

export { API_URL };
