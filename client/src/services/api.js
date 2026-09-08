import axios from "axios";

const isLocalHost =
  typeof window !== "undefined" &&
  ["localhost", "127.0.0.1"].includes(window.location.hostname);

// Keep local development pointed at the local API, while ensuring a production
// build never silently falls back to localhost if VITE_API_URL was omitted.
const defaultApiUrl = isLocalHost
  ? "http://localhost:8000/api"
  : "https://epr-nexuss-marketplace-api.onrender.com/api";

const configuredApiUrl = import.meta.env.VITE_API_URL?.trim();

const api = axios.create({
  baseURL: configuredApiUrl || defaultApiUrl,
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error),
);

export default api;