import { apiClient } from "@/lib/api-client";

export const customersService = {
  list: async () => {
    const response = await apiClient.get("/customers");
    return response.data;
  },
};