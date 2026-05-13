import { Link, useNavigate } from "react-router-dom";
import { Button } from "../components/ui/button";
import AppHeader from "../components/AppHeader";
import {
    Volleyball,
    Trophy,
    Calendar,
    Users,
    Sparkles,
    ArrowRight,
    GripVertical,
    Search,
} from "lucide-react";

export default function Landing() {
    const nav = useNavigate();

    const features = [
        {
            icon: <Calendar className="w-5 h-5" />,
            title: "Jornadas a tu ritmo",
            text: "Genera bolsas de partidos pendientes y agéndalos jornada a jornada.",
        },
        {
            icon: <GripVertical className="w-5 h-5" />,
            title: "Editor tipo Spotify",
            text: "Arrastra los partidos entre canchas y horarios sin tocar inputs.",
        },
        {
            icon: <Users className="w-5 h-5" />,
            title: "Reagendado con permisos",
            text: "Cada equipo tiene 2 comodines de reagendado, contados automáticamente.",
        },
        {
            icon: <Search className="w-5 h-5" />,
            title: "Buscador maestro",
            text: "Filtra simultáneamente tablas y partidos para tu público.",
        },
    ];

    return (
        <div className="min-h-screen bg-slate-50">
            <AppHeader />

            {/* HERO */}
            <section className="relative overflow-hidden">
                <div
                    className="absolute inset-0 bg-cover bg-center"
                    style={{
                        backgroundImage:
                            'url("https://images.unsplash.com/photo-1479859546309-cd77fa21c8f6?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA3MDB8MHwxfHNlYXJjaHwxfHx2b2xsZXliYWxsJTIwY291cnR8ZW58MHx8fHwxNzc3OTQ0NjA0fDA&ixlib=rb-4.1.0&q=85")',
                    }}
                    aria-hidden
                />
                <div
                    className="absolute inset-0 bg-gradient-to-br from-ipn-950/85 via-ipn-900/80 to-slate-900/80"
                    aria-hidden
                />
                <div className="relative max-w-7xl mx-auto px-6 py-20 lg:py-28">
                    <div className="max-w-3xl">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur border border-white/20 text-white/90 text-xs font-bold tracking-widest uppercase">
                            <Sparkles className="w-3.5 h-3.5" /> Voleibol pro
                        </div>
                        <h1 className="mt-6 text-white font-display text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-balance">
                            Organiza tu liga dominical{" "}
                            <span className="text-yellow-300">sin caos</span> y
                            tus torneos rápidos en minutos.
                        </h1>
                        <p className="mt-6 text-lg text-white/85 max-w-2xl">
                            Arrastra partidos como playlists, controla canchas
                            globales, decide cada jornada si juegan femenil,
                            varonil o mixto, y comparte un link público bonito.
                        </p>

                        <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl">
                            <button
                                data-testid="cta-create-league"
                                onClick={() => nav("/register?next=/create/league")}
                                className="group flex flex-col text-left p-6 rounded-2xl bg-white text-slate-900 hover:-translate-y-1 hover:shadow-xl transition-all"
                            >
                                <Trophy className="w-8 h-8 text-ipn-800" />
                                <span className="mt-4 font-display text-2xl font-black">
                                    Crear Liga
                                </span>
                                <span className="text-sm text-slate-500 mt-1">
                                    Temporada con jornadas, reagendos y playoffs
                                </span>
                                <span className="mt-4 inline-flex items-center text-ipn-900 font-bold text-sm">
                                    Empezar{" "}
                                    <ArrowRight className="ml-1 w-4 h-4 transition-transform group-hover:translate-x-1" />
                                </span>
                            </button>

                            <button
                                data-testid="cta-create-quick"
                                onClick={() => nav("/register?next=/create/quick")}
                                className="group flex flex-col text-left p-6 rounded-2xl bg-yellow-300 text-slate-900 hover:-translate-y-1 hover:shadow-xl transition-all"
                            >
                                <Volleyball className="w-8 h-8 text-rose-500" />
                                <span className="mt-4 font-display text-2xl font-black">
                                    Torneo Rápido
                                </span>
                                <span className="text-sm text-slate-700 mt-1">
                                    Genera rol y elimina­torias en un click
                                </span>
                                <span className="mt-4 inline-flex items-center text-rose-600 font-bold text-sm">
                                    Empezar{" "}
                                    <ArrowRight className="ml-1 w-4 h-4 transition-transform group-hover:translate-x-1" />
                                </span>
                            </button>
                        </div>

                        <div className="mt-8 flex items-center gap-4 text-white/80 text-sm">
                            <span>¿Ya tienes cuenta?</span>
                            <Link
                                to="/login"
                                data-testid="hero-login-link"
                                className="underline underline-offset-4 font-semibold hover:text-white"
                            >
                                Inicia sesión
                            </Link>
                            <span className="text-white/40">·</span>
                            <Link
                                to="/arbitro"
                                data-testid="hero-referee-link"
                                className="underline underline-offset-4 font-semibold hover:text-white inline-flex items-center gap-1"
                            >
                                Soy árbitro
                            </Link>
                        </div>
                    </div>
                </div>
            </section>

            {/* Features */}
            <section className="max-w-7xl mx-auto px-6 py-20">
                <div className="max-w-2xl">
                    <p className="text-xs font-bold uppercase tracking-[0.2em] text-ipn-900">
                        Pensado para organizadores
                    </p>
                    <h2 className="mt-3 font-display text-3xl lg:text-4xl font-bold tracking-tight">
                        Sin empalmes, sin Excel, sin dramas.
                    </h2>
                    <p className="mt-4 text-slate-600">
                        VolleyPro reemplaza tu hoja de cálculo con un panel
                        táctil que se siente como una app de música.
                    </p>
                </div>
                <div className="mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {features.map((f, i) => (
                        <div
                            key={i}
                            className="vp-card vp-card-hover p-6"
                            data-testid={`feature-${i}`}
                        >
                            <div className="w-10 h-10 rounded-xl bg-ipn-50 text-ipn-900 grid place-items-center">
                                {f.icon}
                            </div>
                            <h3 className="mt-4 font-display font-bold text-lg">
                                {f.title}
                            </h3>
                            <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                                {f.text}
                            </p>
                        </div>
                    ))}
                </div>
            </section>

            <footer className="border-t border-slate-100 py-8 text-center text-sm text-slate-500">
                Hecho con ❤ para ligas dominicales · VolleyPro
            </footer>
        </div>
    );
}
