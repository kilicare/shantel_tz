import { apiClient } from "@/lib/api-client";

export const authService = {
  login: async (data: { email: string; password: string }) => {
    const response = await apiClient.post("/auth/login", data);
    return response.data;
  },
};