import { api } from "./api";

type Session = {
  user: { id: string; email: string } | null;
};

let session: Session = { user: null };
const listeners: Set<(session: Session) => void> = new Set();

function notifyListeners() {
  listeners.forEach((listener) => listener(session));
}

export function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("auth_token");
}

export function getUserId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("user_id");
}

export function getUserEmail(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("user_email");
}

export const authClient = {
  useSession: () => {
    return { data: session };
  },

  signIn: {
    social: async ({ provider }: { provider: string }) => {
      if (provider === "google") {
        const { url } = await api.auth.googleLogin();
        window.location.href = url;
      }
    },
  },

  signOut: () => {
    localStorage.removeItem("auth_token");
    localStorage.removeItem("user_id");
    localStorage.removeItem("user_email");
    session = { user: null };
    notifyListeners();
  },

  initialize: () => {
    const token = getAuthToken();
    const userId = getUserId();
    const email = getUserEmail();
    if (token && userId && email) {
      session = { user: { id: userId, email } };
      notifyListeners();
      return;
    }
    session = { user: null };
    notifyListeners();
  },

  onSessionChange: (listener: (session: Session) => void) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};

if (typeof window !== "undefined") {
  window.addEventListener("auth-change", () => {
    const token = getAuthToken();
    const userId = getUserId();
    const email = getUserEmail();
    if (token && userId && email) {
      session = { user: { id: userId, email } };
    } else {
      session = { user: null };
    }
    notifyListeners();
  });
}
