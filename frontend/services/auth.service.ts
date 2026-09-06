import { apiClient } from "@/lib/api-client";

export const authService = {
  login: async (data: { email: string; password: string }) => {
    const response = await apiClient.post("/auth/login", data);
    const result = response.data?.data ?? response.data;

    if (typeof window !== "undefined") {
      localStorage.setItem("shantel_access_token", result.accessToken);
      localStorage.setItem("shantel_refresh_token", result.refreshToken);
      localStorage.setItem("shantel_user", JSON.stringify(result.user));
    }

    return result;
  },
};