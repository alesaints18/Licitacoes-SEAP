import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "./queryClient";
import { User } from "@shared/schema";

// Custom hook to get the current authenticated user
export function useCurrentUser() {
  return useQuery<User>({
    queryKey: ['/api/auth/status'],
    retry: false,
    refetchOnWindowFocus: false,
  });
}

// Login function
export async function login(username: string, password: string): Promise<User> {
  const response = await apiRequest("POST", "/api/auth/login", { username, password });
  return response.json();
}

// Logout function
export async function logout(): Promise<void> {
  await apiRequest("POST", "/api/auth/logout", {});
}

// Check if user is admin
export function isAdmin(user: User | undefined | null): boolean {
  return user?.role === "admin";
}
