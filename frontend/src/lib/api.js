import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

export const API = `${BACKEND_URL}/api`;

const TOKEN_KEY = "vp_token";

export function getToken() {
    return localStorage.getItem(TOKEN_KEY);
}

export function setToken(t) {
    if (t) localStorage.setItem(TOKEN_KEY, t);
    else localStorage.removeItem(TOKEN_KEY);
}

export const api = axios.create({
    baseURL: API,
});

api.interceptors.request.use((config) => {
    const t = getToken();
    if (t) {
        config.headers = config.headers || {};
        config.headers.Authorization = `Bearer ${t}`;
    }
    return config;
});

export function formatApiError(detail) {
    if (detail == null) return "Algo salió mal. Inténtalo de nuevo.";
    if (typeof detail === "string") return detail;
    if (Array.isArray(detail))
        return detail
            .map((e) =>
                e && typeof e.msg === "string" ? e.msg : JSON.stringify(e),
            )
            .filter(Boolean)
            .join(" ");
    if (detail && typeof detail.msg === "string") return detail.msg;
    return String(detail);
}
