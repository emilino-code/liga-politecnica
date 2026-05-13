import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { Button } from "./ui/button";
import { LogOut, Volleyball } from "lucide-react";

export default function AppHeader() {
    const { user, logout } = useAuth();
    const nav = useNavigate();

    return (
        <header className="sticky top-0 z-40 bg-white/80 backdrop-blur border-b border-slate-100">
            <div className="max-w-7xl mx-auto flex items-center justify-between px-6 py-4">
                <Link
                    to={user ? "/dashboard" : "/"}
                    className="flex items-center gap-2"
                    data-testid="header-logo"
                >
                    <div className="w-9 h-9 rounded-xl bg-ipn-800 grid place-items-center text-white shadow-sm">
                        <Volleyball className="w-5 h-5" />
                    </div>
                    <span className="font-display text-xl font-black tracking-tight">
                        VolleyPro
                    </span>
                </Link>

                <nav className="flex items-center gap-3">
                    {user ? (
                        <>
                            <span
                                className="hidden sm:inline text-sm text-slate-500"
                                data-testid="header-user-email"
                            >
                                {user.email}
                            </span>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={async () => {
                                    await logout();
                                    nav("/");
                                }}
                                data-testid="header-logout-btn"
                                className="rounded-xl"
                            >
                                <LogOut className="w-4 h-4 mr-1" /> Salir
                            </Button>
                        </>
                    ) : (
                        <>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => nav("/login")}
                                data-testid="header-login-btn"
                                className="rounded-xl"
                            >
                                Ingresar
                            </Button>
                            <Button
                                size="sm"
                                onClick={() => nav("/register")}
                                data-testid="header-register-btn"
                                className="rounded-xl bg-ipn-800 hover:bg-ipn-900"
                            >
                                Crear cuenta
                            </Button>
                        </>
                    )}
                </nav>
            </div>
        </header>
    );
}
