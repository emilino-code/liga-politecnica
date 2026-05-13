import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { toast } from "sonner";
import { Volleyball } from "lucide-react";

export default function Login() {
    const { login } = useAuth();
    const nav = useNavigate();
    const [params] = useSearchParams();
    const next = params.get("next") || "/dashboard";

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);

    const submit = async (e) => {
        e.preventDefault();
        setLoading(true);
        const r = await login(email, password);
        setLoading(false);
        if (r.ok) {
            toast.success("¡Bienvenido de vuelta!");
            nav(next);
        } else {
            toast.error(r.error);
        }
    };

    return (
        <div className="min-h-screen grid lg:grid-cols-2">
            <div className="hidden lg:block relative">
                <div
                    className="absolute inset-0 bg-cover bg-center"
                    style={{
                        backgroundImage:
                            'url("https://images.unsplash.com/photo-1771909713106-86b9a412964a?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA5MDF8MHwxfHNlYXJjaHwzfHx2b2xsZXliYWxsJTIwbWF0Y2h8ZW58MHx8fHwxNzc3OTQ0NjA0fDA&ixlib=rb-4.1.0&q=85")',
                    }}
                />
                <div className="absolute inset-0 bg-gradient-to-br from-ipn-950/70 to-slate-900/80" />
                <div className="relative h-full flex flex-col justify-end p-12 text-white">
                    <h2 className="font-display text-4xl font-black">
                        El cancho­meter más fácil del barrio.
                    </h2>
                    <p className="mt-4 text-white/80 max-w-md">
                        Inicia sesión y sigue donde lo dejaste.
                    </p>
                </div>
            </div>

            <div className="flex items-center justify-center p-8">
                <form
                    onSubmit={submit}
                    className="w-full max-w-md"
                    data-testid="login-form"
                >
                    <Link to="/" className="flex items-center gap-2 mb-10">
                        <div className="w-10 h-10 rounded-xl bg-ipn-800 grid place-items-center text-white shadow-sm">
                            <Volleyball className="w-5 h-5" />
                        </div>
                        <span className="font-display text-xl font-black">
                            VolleyPro
                        </span>
                    </Link>

                    <h1 className="font-display text-3xl font-black">
                        Bienvenido de vuelta
                    </h1>
                    <p className="text-slate-500 mt-2">
                        Tu liga te está esperando.
                    </p>

                    <div className="mt-8 space-y-5">
                        <div className="space-y-2">
                            <Label htmlFor="email">Correo</Label>
                            <Input
                                id="email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="profe@escuela.com"
                                className="h-12 rounded-xl"
                                required
                                data-testid="login-email-input"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="password">Contraseña</Label>
                            <Input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                className="h-12 rounded-xl"
                                required
                                data-testid="login-password-input"
                            />
                        </div>

                        <Button
                            type="submit"
                            disabled={loading}
                            className="w-full h-12 rounded-xl bg-ipn-800 hover:bg-ipn-900 text-base font-bold"
                            data-testid="login-submit-btn"
                        >
                            {loading ? "Ingresando…" : "Entrar"}
                        </Button>
                    </div>

                    <p className="mt-6 text-sm text-slate-500 text-center">
                        ¿No tienes cuenta?{" "}
                        <Link
                            to="/register"
                            className="text-ipn-900 font-semibold hover:underline"
                            data-testid="login-go-register"
                        >
                            Crea una gratis
                        </Link>
                    </p>
                </form>
            </div>
        </div>
    );
}
