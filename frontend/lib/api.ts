const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  (process.env.NODE_ENV === "development" ? "http://localhost:8000" : "");

function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("auth_token");
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  if (!API_BASE_URL) {
    throw new Error("NEXT_PUBLIC_API_URL is not configured.");
  }

  const token = getAuthToken();
  const headers = new Headers(options.headers);
  headers.set("Content-Type", "application/json");

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const res = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
    credentials: "include",
  });

  if (res.status === 401 && typeof window !== "undefined") {
    localStorage.removeItem("auth_token");
    localStorage.removeItem("user_id");
    localStorage.removeItem("user_email");
    window.dispatchEvent(new Event("auth-change"));
  }

  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: "Request failed" }));
    if (res.status === 401) {
      throw new Error("Session expired. Please sign in again.");
    }
    throw new Error(error.detail || `HTTP ${res.status}`);
  }

  return res.json();
}

export const api = {
  auth: {
    googleLogin: () => request<{ url: string }>("/auth/google"),
    googleCallback: (code: string, state: string) =>
      request<{ success: boolean; user: ApiUser }>(
        `/auth/google/callback?code=${encodeURIComponent(code)}&state=${encodeURIComponent(state)}`,
        { method: "GET" }
      ),
    getMe: () => request<{ user: ApiUser | null }>("/auth/me"),
    logout: () => request<{ success: boolean }>("/auth/logout", { method: "POST" }),
    refresh: () => request<{ success: boolean; token: string }>("/auth/refresh", { method: "POST" }),
  },

  finalists: {
    getAll: () => request<FinalistsResponse>("/finalists"),
    getOne: (uuid: string) => request<Finalist>(`/finalists/${uuid}`),
  },

  votes: {
    getCounts: () => request<{ counts: Record<string, number> }>("/votes"),
    submit: (finalistId: string, category: string) =>
      request<VoteResponse>("/votes", {
        method: "POST",
        body: JSON.stringify({ finalist_id: finalistId, category }),
      }),
    getStatus: () => request<VotingStatus>("/votes/status"),
    check: (track: string, round: string) =>
      request<VoteCheck>(`/votes/check?track=${track}&round=${round}`),
  },

  admin: {
    getStatus: () => request<{ isAdmin: boolean }>("/admin/status"),
    toggleCategory: (key: string, enabled: boolean) =>
      request<SettingsResponse>("/admin/toggle-category", {
        method: "POST",
        body: JSON.stringify({ key, enabled }),
      }),
    nextCategory: () => request<NextCategoryResponse>("/admin/next-category", { method: "POST" }),
    getResults: () => request<AdminResult[]>("/admin/results"),
  },

  schedule: {
    get: () => request<ScheduleResponse>("/schedule"),
  },
};

export interface ApiUser {
  id: string;
  email: string;
  name?: string;
  picture?: string;
  role: string;
}

export interface Finalist {
  uuid_id: string;
  name: string;
  semester: string;
  department: string;
  track: "Eastern" | "Western";
  round: "Duet" | "Solo";
  avatar_url?: string;
}

export interface Duet {
  duet_name: string;
  member1_id: string;
  member2_id: string;
}

export interface FinalistsResponse {
  finalists: Finalist[];
  duets: Duet[];
}

export interface VoteResponse {
  success: boolean;
  message: string;
}

export interface VoteCheck {
  hasVoted: boolean;
  votedFinalistId?: string;
}

export interface VotingStatus {
  voting_duet_eastern: boolean;
  voting_duet_western: boolean;
  voting_solo_eastern: boolean;
  voting_solo_western: boolean;
  active_category?: string;
}

export interface ScheduleSlot {
  time: string;
  track: "Eastern" | "Western";
  round: "Duet" | "Solo";
  venue: string;
}

export interface ScheduleResponse {
  schedule: ScheduleSlot[];
}

export interface SettingsResponse {
  success: boolean;
  key: string;
  enabled: boolean;
}

export interface NextCategoryResponse {
  success: boolean;
  new_category?: string;
  message: string;
}

export interface AdminResult {
  uuid_id: string;
  name: string;
  stage_name?: string;
  track: "Eastern" | "Western";
  round: "Duet" | "Solo";
  votes: number;
}
