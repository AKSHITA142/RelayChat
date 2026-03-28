import axios from "axios";
import { config } from "../config";

const api = axios.create({
  baseURL: config.endpoints.base(),
});

api.interceptors.request.use(config => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const requestUrl = error.config?.url || "";
    const isAuthEndpoint =
      requestUrl.startsWith("/auth/login") ||
      requestUrl.startsWith("/auth/send-email-otp") ||
      requestUrl.startsWith("/auth/verify-email-otp") ||
      requestUrl.startsWith("/auth/complete-registration");

    // Don't force session-expired redirect for auth endpoints:
    // those can legitimately return 401/400 (e.g. invalid credentials/OTP).
    if (status === 401 && !isAuthEndpoint) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      localStorage.removeItem("session-active");
      window.location.href = "/login?session_expired=true";
    }
    return Promise.reject(error);
  }
);

export default api;   