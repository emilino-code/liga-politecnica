import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, formatApiError } from "../lib/api";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { toast } from "sonner";
import { Flag, ArrowLeft } from "lucide-react";

export default function RefereeLogin() {
    const nav = useNavigate();
    const [slug, setSlug] = useState("");
    const [pin, setPin] = useState("");
    const [loading, setLoading] = useState(false);

    const submit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await api.post("/referee/auth", { slug: slug.trim(), pin: pin.trim() });
            sessionStorage.setItem(
                "vp_ref",
                JSON.stringify({ slug: slug.trim(), pin: pin.trim() }),
            );
            toast.success("Acceso concedido");
            nav(`/arbitro/${slug.trim()}`);
        } catch (err) {
            toast.error(formatApiError(err.response?.data?.detail));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen grid lg:grid-cols-2">
            <div className="hidden lg:block relative">
                <div className="absolute inset-0 bg-gradient-to-br from-ipn-900 to-ipn-950" />
                <div
                    className="absolute inset-0 opacity-30 mix-blend-overlay bg-cover bg-center"
                    style={{
                        backgroundImage:
                            'url("https://images.unsplash.com/photo-1479859546309-cd77fa21c8f6?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA3MDB8MHwxfHNlYXJjaHwxfHx2b2xsZXliYWxsJTIwY291cnR8ZW58MHx8fHwxNzc3OTQ0NjA0fDA&ixlib=rb-4.1.0&q=85")',
                    }}
                />
                <div className="relative h-full flex flex-col justify-end p-12 text-white">
                    <Flag className="w-10 h-10 text-ipnYellow mb-4" />
                    <h2 className="font-display text-4xl font-black">
                        Panel de árbitros
                    </h2>
                    <p className="mt-4 text-white/80 max-w-md">
                        Anota resultados rápido. Sin líos, sin Excel.
                    </p>
                </div>
            </div>

            <div className="flex items-center justify-center p-8 bg-white">
                <form onSubmit={submit} className="w-full max-w-md" data-testid="referee-login-form">
                    <Link
                        to="/"
                        className="text-slate-500 hover:text-slate-900 inline-flex items-center gap-1 text-sm mb-6"
                    >
                        <ArrowLeft className="w-4 h-4" /> Inicio
                    </Link>
                    <h1 className="font-display text-3xl font-black">
                        Acceso de árbitro
                    </h1>
                    <p className="text-slate-500 mt-2">
                        Usa el código del torneo y el PIN que te dio el
                        organizador.
                    </p>

                    <div className="mt-8 space-y-5">
                        <div className="space-y-2">
                            <Label htmlFor="slug">Código del torneo</Label>
                            <Input
                                id="slug"
                                value={slug}
                                onChange={(e) => setSlug(e.target.value)}
                                placeholder="liga-dominical-xxxxxx"
                                className="h-12 rounded-xl"
                                required
                                data-testid="referee-slug"
                            />
                            <p className="text-xs text-slate-400">
                                Aparece al final del link público del torneo.
                            </p>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="pin">PIN</Label>
                            <Input
                                id="pin"
                                value={pin}
                                onChange={(e) => setPin(e.target.value)}
                                placeholder="4 dígitos"
                                inputMode="numeric"
                                className="h-12 rounded-xl tracking-[0.5em] text-center text-lg font-bold"
                                required
                                data-testid="referee-pin"
                            />
                        </div>

                        <Button
                            type="submit"
                            disabled={loading}
                            className="w-full h-12 rounded-xl bg-ipn-800 hover:bg-ipn-900 text-base font-bold"
                            data-testid="referee-submit"
                        >
                            {loading ? "Verificando…" : "Entrar"}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
