import { NextResponse } from "next/server";

type TokenResult =
  | { token: string }
  | { error: string; details?: string; status: number };

function getApiUrl() {
  const apiUrl = process.env.API_URL;
  if (!apiUrl) {
    throw new Error("API_URL is not set. Configure it in .env.");
  }
  return apiUrl;
}

export async function getDataApiToken(request: Request): Promise<TokenResult> {
  const origin = new URL(request.url).origin;
  const tokenRes = await fetch(`${origin}/api/auth/token`, {
    method: "GET",
    headers: {
      cookie: request.headers.get("cookie") ?? "",
    },
    cache: "no-store",
  });

  if (!tokenRes.ok) {
    return {
      error: "Unable to obtain auth token",
      details: await tokenRes.text(),
      status: tokenRes.status,
    };
  }

  const payload = (await tokenRes.json()) as { token?: string; data?: { token?: string } };
  const token = payload.token ?? payload.data?.token;

  if (!token) {
    return {
      error: "Auth token missing in /api/auth/token response",
      details: JSON.stringify(payload),
      status: 401,
    };
  }

  return { token };
}

type DataApiResult<T> =
  | { data: T }
  | { error: string; details?: string; status: number };

export async function dataApiFetch<T>(
  token: string,
  path: string,
  init?: Omit<RequestInit, "headers"> & { headers?: HeadersInit },
): Promise<DataApiResult<T>> {
  return dataApiFetchWithBearer(token, path, init);
}

export async function dataApiFetchWithBearer<T>(
  bearerToken: string,
  path: string,
  init?: Omit<RequestInit, "headers"> & { headers?: HeadersInit },
): Promise<DataApiResult<T>> {
  let apiUrl: string;
  try {
    apiUrl = getApiUrl();
  } catch (err) {
    return {
      error: "Data API URL missing",
      details: String(err),
      status: 500,
    };
  }

  const res = await fetch(`${apiUrl}/${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${bearerToken}`,
      Accept: "application/json",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });

  if (!res.ok) {
    return {
      error: "Data API request failed",
      details: await res.text(),
      status: res.status,
    };
  }

  if (res.status === 204) {
    return { data: undefined as T };
  }

  const raw = await res.text();
  if (!raw) {
    return { data: undefined as T };
  }

  return { data: JSON.parse(raw) as T };
}

export function toErrorResponse(result: { error: string; details?: string; status: number }) {
  return NextResponse.json(
    {
      error: result.error,
      details: result.details,
    },
    { status: result.status },
  );
}
