import { create } from "zustand";
import { persist } from "zustand/middleware";

interface User {
  id: number;
  name: string;
  email: string;
  role?: {
    name: string;
    permissions?: any[];
  };
}

interface AuthState {
  token: string | null;
  user: User | null;
  setAuth: (token: string, user: User) => void;
  clearAuth: () => void;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      setAuth: (token, user) => set({ token, user }),
      clearAuth: () => set({ token: null, user: null }),
      logout: async () => {
        const token = get().token;
        // Fire and forget the server-side logout
        if (token) {
          try {
            const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
            const url = baseUrl
              ? `${baseUrl.replace(/\/$/, "")}/api/auth/logout`
              : "/api/auth/logout";
            await fetch(url, {
              method: "POST",
              headers: {
                Authorization: `Bearer ${token}`,
                Accept: "application/json",
              },
            });
          } catch {
            // Even if server call fails, clear local state
          }
        }
        set({ token: null, user: null });
        if (typeof window !== "undefined") {
          window.location.href = "/login";
        }
      },
    }),
    {
      name: "auth-storage",
    }
  )
);
