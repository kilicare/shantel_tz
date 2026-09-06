import { apiClient } from "@/lib/api-client";

export const productsService = {
  list: async () => {
    const response = await apiClient.get("/products");
    return response.data;
  },
};