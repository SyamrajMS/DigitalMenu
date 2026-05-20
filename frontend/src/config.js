// Central API configuration
// In production (Render), VITE_API_HOST is set as an environment variable
// e.g. https://digital-menu-backend.onrender.com
// In local development, it falls back to the local machine's IP on port 4000

const rawHost = import.meta.env.VITE_API_HOST;

// If VITE_API_HOST is set, use it directly (it's the full base URL)
// Otherwise fall back to local network access
export const API_HOST = rawHost
  ? rawHost.replace(/\/$/, '') // strip any trailing slash
  : `http://${window.location.hostname}:4000`;

export const SOCKET_URL = API_HOST;
