import axios from "axios";

export const http = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL ?? "/api/v1",
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

// Demo server wake detection (free-tier cold start): the first successful
// response that carries data proves the backend is up. The wake banner
// (components/layout/wake-banner.tsx) listens for this event and hides.
// Key/event names are shared with the server-wake-modal feature branch.
const SERVER_AWAKE_KEY = "demo:server-awake";
export const SERVER_AWAKE_EVENT = "demo:server-awake";

if (typeof window !== "undefined") {
  http.interceptors.response.use((response) => {
    const hasData =
      response.data !== undefined &&
      response.data !== null &&
      response.data !== "";
    if (response.status >= 200 && response.status < 300 && hasData) {
      try {
        if (sessionStorage.getItem(SERVER_AWAKE_KEY) !== "1") {
          sessionStorage.setItem(SERVER_AWAKE_KEY, "1");
        }
      } catch {
        // storage unavailable — still notify listeners
      }
      window.dispatchEvent(new Event(SERVER_AWAKE_EVENT));
    }
    return response;
  });
}
