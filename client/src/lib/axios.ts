import axios, { type AxiosInstance, type InternalAxiosRequestConfig } from "axios";
import toast from "react-hot-toast";
import { API_URL, STORAGE_KEYS } from "@/config";

const instance: AxiosInstance = axios.create({
  baseURL: API_URL,
  withCredentials: false,
  headers: { "Content-Type": "application/json" },
});

/** Attach the access token to every request. */
instance.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = localStorage.getItem(STORAGE_KEYS.accessToken);
  if (token) config.headers.set("Authorization", `Bearer ${token}`);
  return config;
});

let isRefreshing = false;

/** Surface API errors as toasts and normalise the error shape. */
instance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error.response?.status;
    const message: string =
      error.response?.data?.message ?? error.message ?? "Something went wrong";

    if (status === 401 && !isRefreshing) {
      // Full refresh-token flow lands in Phase 3; for Phase 1, clear tokens + redirect to /login.
      isRefreshing = true;
      localStorage.removeItem(STORAGE_KEYS.accessToken);
      localStorage.removeItem(STORAGE_KEYS.refreshToken);
      if (window.location.pathname !== "/login") {
        toast.error("Your session has expired. Please log in again.");
        window.location.assign("/login");
      }
      isRefreshing = false;
    } else if (status && status >= 500) {
      toast.error("Server error. Please try again later.");
    } else if (status && status !== 401) {
      toast.error(message);
    }

    return Promise.reject({
      status,
      message,
      errors: error.response?.data?.errors,
      raw: error,
    });
  },
);

export const api = instance;
export default instance;