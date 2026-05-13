import {
    createContext,
    useContext,
    useEffect,
    useState,
    useCallback,
} from "react";
import { api, formatApiError, setToken, getToken } from "../lib/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null); // null = checking
    const [checked, setChecked] = useState(false);

    const refresh = useCallback(async () => {
        const tok = getToken();
        if (!tok) {
            setUser(false);
            setChecked(true);
            return;
        }
        try {
            const { data } = await api.get("/auth/me");
            setUser(data);
        } catch {
            setToken(null);
            setUser(false);
        } finally {
            setChecked(true);
        }
    }, []);

    useEffect(() => {
        refresh();
    }, [refresh]);

    const login = async (email, password) => {
        try {
            const { data } = await api.post("/auth/login", { email, password });
            setToken(data.token);
            setUser({ id: data.id, email: data.email, name: data.name });
            return { ok: true };
        } catch (e) {
            return { ok: false, error: formatApiError(e.response?.data?.detail) };
        }
    };

    const register = async (email, password, name) => {
        try {
            const { data } = await api.post("/auth/register", {
                email,
                password,
                name,
            });
            setToken(data.token);
            setUser({ id: data.id, email: data.email, name: data.name });
            return { ok: true };
        } catch (e) {
            return { ok: false, error: formatApiError(e.response?.data?.detail) };
        }
    };

    const logout = async () => {
        try {
            await api.post("/auth/logout");
        } catch {}
        setToken(null);
        setUser(false);
    };

    return (
        <AuthContext.Provider
            value={{ user, checked, login, register, logout, refresh }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    return useContext(AuthContext);
}
