import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import AppHeader from "../components/AppHeader";
import { Button } from "../components/ui/button";
import {
    Trophy,
    Volleyball,
    Plus,
    Calendar,
    Users,
    Trash2,
    ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "../components/ui/alert-dialog";

export default function Dashboard() {
    const [tournaments, setTournaments] = useState(null);
    const nav = useNavigate();

    const load = async () => {
        try {
            const { data } = await api.get("/tournaments");
            setTournaments(data);
        } catch (e) {
            toast.error("No se pudieron cargar los torneos");
        }
    };

    useEffect(() => {
        load();
    }, []);

    const remove = async (id) => {
        try {
            await api.delete(`/tournaments/${id}`);
            toast.success("Torneo eliminado");
            load();
        } catch {
            toast.error("Error al eliminar");
        }
    };

    return (
        <div className="min-h-screen bg-slate-50">
            <AppHeader />
            <main className="max-w-7xl mx-auto px-6 py-10">
                <div className="flex items-center justify-between flex-wrap gap-4">
                    <div>
                        <p className="text-xs font-bold uppercase tracking-[0.2em] text-ipn-900">
                            Tu sala de control
                        </p>
                        <h1 className="font-display text-3xl lg:text-4xl font-black mt-2">
                            Mis torneos y ligas
                        </h1>
                    </div>

                    <div className="flex gap-3">
                        <Button
                            onClick={() => nav("/create/quick")}
                            className="h-12 rounded-xl bg-yellow-300 hover:bg-yellow-400 text-slate-900 font-bold shadow-sm"
                            data-testid="dashboard-create-quick"
                        >
                            <Volleyball className="w-4 h-4 mr-2" />
                            Torneo Rápido
                        </Button>
                        <Button
                            onClick={() => nav("/create/league")}
                            className="h-12 rounded-xl bg-ipn-800 hover:bg-ipn-900 font-bold shadow-sm"
                            data-testid="dashboard-create-league"
                        >
                            <Trophy className="w-4 h-4 mr-2" />
                            Crear Liga
                        </Button>
                    </div>
                </div>

                <div className="mt-10">
                    {tournaments === null && (
                        <div className="text-slate-500">Cargando torneos…</div>
                    )}
                    {tournaments && tournaments.length === 0 && (
                        <EmptyState onCreate={() => nav("/create/league")} />
                    )}
                    {tournaments && tournaments.length > 0 && (
                        <div
                            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                            data-testid="dashboard-tournament-grid"
                        >
                            {tournaments.map((t) => (
                                <TournamentCard
                                    key={t.id}
                                    t={t}
                                    onOpen={() => nav(`/t/${t.id}`)}
                                    onDelete={() => remove(t.id)}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}

function TournamentCard({ t, onOpen, onDelete }) {
    const isLeague = t.kind === "league";
    return (
        <div
            className="vp-card vp-card-hover p-6 flex flex-col"
            data-testid={`tournament-card-${t.id}`}
        >
            <div className="flex items-start justify-between">
                <span
                    className={`text-xs font-bold uppercase tracking-widest px-2 py-1 rounded-full ${
                        isLeague
                            ? "bg-ipn-100 text-ipn-900"
                            : "bg-yellow-100 text-yellow-800"
                    }`}
                >
                    {isLeague ? "Liga" : "Torneo Rápido"}
                </span>
                <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <button
                            className="text-slate-400 hover:text-rose-500 transition-colors"
                            data-testid={`tournament-delete-${t.id}`}
                            title="Eliminar"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>
                                ¿Eliminar este torneo?
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                                Se borrarán todos los partidos y datos de
                                "{t.name}". Esta acción no se puede deshacer.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                                onClick={onDelete}
                                className="bg-rose-500 hover:bg-rose-600"
                            >
                                Eliminar
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>

            <h3 className="font-display text-xl font-bold mt-4 line-clamp-2">
                {t.name}
            </h3>

            <div className="mt-4 grid grid-cols-2 gap-3 text-sm text-slate-600">
                <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-slate-400" />
                    <span>{t.categorias?.length || 0} categorías</span>
                </div>
                <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-slate-400" />
                    <span>{t.canchas} canchas</span>
                </div>
            </div>

            <div className="mt-6 flex gap-2">
                <Button
                    onClick={onOpen}
                    className="flex-1 h-11 rounded-xl bg-slate-900 hover:bg-slate-800 text-white"
                    data-testid={`tournament-open-${t.id}`}
                >
                    Abrir
                </Button>
                <Link
                    to={`/public/${t.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="h-11 rounded-xl border border-slate-200 hover:bg-slate-50 grid place-items-center px-4 text-slate-700"
                    data-testid={`tournament-public-${t.id}`}
                    title="Vista pública"
                >
                    <ExternalLink className="w-4 h-4" />
                </Link>
            </div>
        </div>
    );
}

function EmptyState({ onCreate }) {
    return (
        <div className="vp-card p-12 text-center">
            <div className="mx-auto w-16 h-16 rounded-2xl bg-ipn-50 grid place-items-center text-ipn-800">
                <Plus className="w-8 h-8" />
            </div>
            <h3 className="mt-6 font-display text-2xl font-black">
                Aún no tienes torneos
            </h3>
            <p className="mt-2 text-slate-500 max-w-md mx-auto">
                Crea tu primer torneo o liga y empieza a organizar tus
                jornadas.
            </p>
            <Button
                onClick={onCreate}
                className="mt-6 h-12 rounded-xl bg-ipn-800 hover:bg-ipn-900"
                data-testid="empty-create-btn"
            >
                Crear ahora
            </Button>
        </div>
    );
}
