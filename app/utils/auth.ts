export type AppRole = "patient" | "staff" | "doctor" | "admin" | "monitor";

type SessionUser = {
  role?: string | null;
};

type AuthSession = {
  user?: SessionUser | null;
} | null;

export function getHomeByRole(role?: string | null) {
  if (role === "staff") return "/staff";
  if (role === "doctor") return "/doctor";
  if (role === "admin") return "/admin";
  if (role === "monitor") return "/monitor";
  return "/";
}

export async function getAuthSession(): Promise<AuthSession> {
  try {
    return await $fetch<AuthSession>("/api/auth/get-session", {
      credentials: "include",
      headers: import.meta.server ? useRequestHeaders(["cookie"]) : undefined,
    });
  } catch {
    return null;
  }
}
