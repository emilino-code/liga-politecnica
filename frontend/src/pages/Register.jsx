import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { toast } from "sonner";
import { Volleyball } from "lucide-react";

export default function Register() {
    const { register } = useAuth();
    const nav = useNavigate();
    const [params] = useSearchParams();
    const next = params.get("next") || "/dashboard";

    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);

    const submit = async (e) => {
        e.preventDefault();
        if (password.length < 6) {
            toast.error("La contraseña debe tener al menos 6 caracteres");
            return;
        }
        setLoading(true);
        const r = await register(email, password, name);
        setLoading(false);
        if (r.ok) {
            toast.success("¡Cuenta creada!");
            nav(next);
        } else {
            toast.error(r.error);
        }
    };

    return (
        <div className="min-h-screen grid lg:grid-cols-2">
            <div className="flex items-center justify-center p-8 order-2 lg:order-1">
                <form
                    onSubmit={submit}
                    className="w-full max-w-md"
                    data-testid="register-form"
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
                        Crea tu cuenta de organizador
                    </h1>
                    <p className="text-slate-500 mt-2">
                        Cada cuenta tiene sus propios torneos y ligas.
                    </p>

                    <div className="mt-8 space-y-5">
                        <div className="space-y-2">
                            <Label htmlFor="name">Tu nombre</Label>
                            <Input
                                id="name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Profe Carlos"
                                className="h-12 rounded-xl"
                                required
                                data-testid="register-name-input"
                            />
                        </div>
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
                                data-testid="register-email-input"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="password">Contraseña</Label>
                            <Input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Mínimo 6 caracteres"
                                className="h-12 rounded-xl"
                                required
                                data-testid="register-password-input"
                            />
                        </div>

                        <Button
                            type="submit"
                            disabled={loading}
                            className="w-full h-12 rounded-xl bg-ipn-800 hover:bg-ipn-900 text-base font-bold"
                            data-testid="register-submit-btn"
                        >
                            {loading ? "Creando…" : "Crear cuenta"}
                        </Button>
                    </div>

                    <p className="mt-6 text-sm text-slate-500 text-center">
                        ¿Ya tienes cuenta?{" "}
                        <Link
                            to="/login"
                            className="text-ipn-900 font-semibold hover:underline"
                            data-testid="register-go-login"
                        >
                            Inicia sesión
                        </Link>
                    </p>
                </form>
            </div>

            <div className="hidden lg:block relative order-1 lg:order-2">
                <div
                    className="absolute inset-0 bg-cover bg-center"
                    style={{
                        backgroundImage:
                            'url("https://images.unsplash.com/photo-1601512986351-9b0e01780eef?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA5MDF8MHwxfHNlYXJjaHw0fHx2b2xsZXliYWxsJTIwbWF0Y2h8ZW58MHx8fHwxNzc3OTQ0NjA0fDA&ixlib=rb-4.1.0&q=85")',
                    }}
                />
                <div className="absolute inset-0 bg-gradient-to-br from-rose-900/60 to-ipn-950/80" />
                <div className="relative h-full flex flex-col justify-end p-12 text-white">
                    <h2 className="font-display text-4xl font-black">
                        Tu temporada empieza aquí.
                    </h2>
                    <p className="mt-4 text-white/80 max-w-md">
                        Crea tu primera liga en menos de 5 minutos.
                    </p>
                </div>
            </div>
        </div>
    );
}
