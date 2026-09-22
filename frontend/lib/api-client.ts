import axios from "axios";

const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ||
    (process.env.NODE_ENV === 'production' ? 'https://shantel-tz.onrender.com/api/v1' : 'http://localhost:3001/api/v1'),
  headers: {
    "Content-Type": "application/json",
  },
});

apiClient.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = sessionStorage.getItem("shantel_access_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }

  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const responseMessage = error.response?.data?.message;
    const isPasswordRecoveryEndpoint = error.config?.url?.includes('/auth/forgot-password') ||
                                       error.config?.url?.includes('/auth/verify-otp') ||
                                       error.config?.url?.includes('/auth/reset-password');

    const authenticationFailure =
      (error.response?.status === 401 ||
        (error.response?.status === 403 &&
          ["User not authenticated", "No authentication token provided", "Invalid or expired token"].includes(responseMessage))) &&
      !isPasswordRecoveryEndpoint;

    if (typeof window !== "undefined" && authenticationFailure) {
      sessionStorage.removeItem("shantel_access_token");
      sessionStorage.removeItem("shantel_refresh_token");
      sessionStorage.removeItem("shantel_user");
      localStorage.removeItem("shantel_access_token");
      localStorage.removeItem("shantel_refresh_token");
      localStorage.removeItem("shantel_user");
      if (!window.location.pathname.startsWith("/login")) window.location.assign("/login");
    }
    return Promise.reject(error);
  },
);

export { apiClient };