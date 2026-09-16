import { apiClient } from "@/lib/api-client";

export const authService = {
  login: async (data: { email: string; password: string }) => {
    const response = await apiClient.post("/auth/login", data);
    const result = response.data?.data ?? response.data;

    if (typeof window !== "undefined") {
      sessionStorage.setItem("shantel_access_token", result.accessToken);
      sessionStorage.setItem("shantel_refresh_token", result.refreshToken);
      sessionStorage.setItem("shantel_user", JSON.stringify(result.user));
      localStorage.setItem("shantel_user", JSON.stringify(result.user));
    }

    return result;
  },
};