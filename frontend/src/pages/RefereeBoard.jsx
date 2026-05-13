import { useEffect, useMemo, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api, formatApiError } from "../lib/api";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "../components/ui/select";
import { toast } from "sonner";
import { Flag, Search, LogOut, RefreshCw } from "lucide-react";
import RefereeScoreDialog from "../components/RefereeScoreDialog";

export default function RefereeBoard() {
    const { slug } = useParams();
    const nav = useNavigate();
    const [pin, setPin] = useState("");
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [q, setQ] = useState("");
    const [canchaFilter, setCanchaFilter] = useState("all");
    const [statusFilter, setStatusFilter] = useState("all");
    const [selected, setSelected] = useState(null);

    const loadData = useCallback(
        async (pinValue) => {
            try {
                const { data } = await api.get(`/referee/${slug}/matches`, {
                    params: { pin: pinValue },
                });
                setData(data);
            } catch (err) {
                toast.error(formatApiError(err.response?.data?.detail));
                sessionStorage.removeItem("vp_ref");
                nav("/arbitro");
            } finally {
                setLoading(false);
            }
        },
        [slug, nav],
    );

    useEffect(() => {
        const stored = sessionStorage.getItem("vp_ref");
        if (!stored) {
            nav("/arbitro");
            return;
        }
        try {
            const { pin: p, slug: s } = JSON.parse(stored);
            if (s !== slug) {
                nav("/arbitro");
                return;
            }
            setPin(p);
            loadData(p);
        } catch {
            nav("/arbitro");
        }
    }, [slug, nav, loadData]);

    const matches = data?.matches || [];
    const tournament = data?.tournament;

    const filteredMatches = useMemo(() => {
        // Only matches with assigned time/court (scheduled or already played)
        let list = matches.filter(
            (m) => m.hora && m.cancha && m.status !== "draft",
        );
        if (canchaFilter !== "all") {
            list = list.filter((m) => String(m.cancha) === canchaFilter);
        }
        if (statusFilter === "pending") {
            list = list.filter((m) => m.status !== "played");
        } else if (statusFilter === "played") {
            list = list.filter((m) => m.status === "played");
        }
        if (q.trim()) {
            const s = q.toLowerCase();
            list = list.filter((m) =>
                [m.local, m.visitante, m.hora, String(m.cancha), m.fase]
                    .filter(Boolean)
                    .some((x) => String(x).toLowerCase().includes(s)),
            );
        }
        return list.slice().sort((a, b) => {
            const ha = a.hora || "99:99";
            const hb = b.hora || "99:99";
            if (ha !== hb) return ha.localeCompare(hb);
            return (a.cancha || 0) - (b.cancha || 0);
        });
    }, [matches, canchaFilter, statusFilter, q]);

    const canchas = useMemo(() => {
        const set = new Set(matches.map((m) => m.cancha));
        return Array.from(set).sort((a, b) => a - b);
    }, [matches]);

    const logout = () => {
        sessionStorage.removeItem("vp_ref");
        nav("/arbitro");
    };

    if (loading) {
        return (
            <div className="min-h-screen grid place-items-center text-slate-500">
                Cargando…
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50">
            <header className="bg-gradient-to-br from-ipn-900 to-ipn-950 text-white">
                <div className="max-w-6xl mx-auto px-6 py-8 flex items-center justify-between flex-wrap gap-3">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-ipnYellow grid place-items-center text-ipn-950">
                            <Flag className="w-5 h-5" />
                        </div>
                        <div>
                            <div className="text-xs uppercase tracking-widest text-white/70">
                                Árbitro
                            </div>
                            <h1 className="font-display text-xl font-black">
                                {tournament?.name}
                            </h1>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            onClick={() => loadData(pin)}
                            className="rounded-xl bg-white/10 border-white/20 text-white hover:bg-white/20"
                            data-testid="referee-refresh"
                        >
                            <RefreshCw className="w-4 h-4" />
                        </Button>
                        <Button
                            variant="outline"
                            onClick={logout}
                            className="rounded-xl bg-white/10 border-white/20 text-white hover:bg-white/20"
                            data-testid="referee-logout"
                        >
                            <LogOut className="w-4 h-4 mr-1" />
                            Salir
                        </Button>
                    </div>
                </div>
            </header>

            <main className="max-w-6xl mx-auto px-6 py-8">
                <div className="vp-card p-4 mb-6 grid grid-cols-1 md:grid-cols-12 gap-3">
                    <div className="md:col-span-6 flex items-center gap-2">
                        <Search className="w-5 h-5 text-slate-400 ml-2" />
                        <Input
                            value={q}
                            onChange={(e) => setQ(e.target.value)}
                            placeholder="Buscar equipo, hora, cancha…"
                            className="border-none shadow-none focus-visible:ring-0 h-11"
                            data-testid="referee-search"
                        />
                    </div>
                    <div className="md:col-span-3">
                        <Select value={canchaFilter} onValueChange={setCanchaFilter}>
                            <SelectTrigger className="h-11 rounded-xl" data-testid="referee-cancha-filter">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todas las canchas</SelectItem>
                                {canchas.map((c) => (
                                    <SelectItem key={c} value={String(c)}>
                                        Cancha {c}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="md:col-span-3">
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger className="h-11 rounded-xl" data-testid="referee-status-filter">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todos</SelectItem>
                                <SelectItem value="pending">Pendientes</SelectItem>
                                <SelectItem value="played">Jugados</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <div className="space-y-2">
                    {filteredMatches.length === 0 && (
                        <div className="vp-card p-8 text-center text-slate-500">
                            No hay partidos con ese filtro.
                        </div>
                    )}
                    {filteredMatches.map((m) => (
                        <button
                            key={m.id}
                            onClick={() => setSelected(m)}
                            className={`w-full text-left vp-card vp-card-hover p-4 flex items-center gap-4 ${
                                m.status === "played" ? "opacity-75" : ""
                            }`}
                            data-testid={`referee-match-${m.id}`}
                        >
                            <div className="text-center w-20 flex-shrink-0">
                                <div className="text-xs font-bold uppercase text-slate-400">
                                    {m.hora || "—"}
                                </div>
                                <div className="text-lg font-display font-black text-ipn-800">
                                    C{m.cancha}
                                </div>
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                                    <span
                                        className={`px-1.5 py-0.5 rounded ${
                                            m.branch === "femenil"
                                                ? "bg-ipn-100 text-ipn-900"
                                                : "bg-slate-800 text-white"
                                        }`}
                                    >
                                        {m.branch}
                                    </span>
                                    <span>{m.fase}</span>
                                </div>
                                <div className="mt-1 font-bold truncate">
                                    {m.local}{" "}
                                    <span className="text-slate-400 mx-1">
                                        vs
                                    </span>{" "}
                                    {m.visitante}
                                </div>
                            </div>
                            <div className="text-right w-24 flex-shrink-0">
                                {m.status === "played" ? (
                                    <span className="text-sm font-bold bg-emerald-100 text-emerald-800 px-2 py-1 rounded-lg">
                                        {m.score}
                                    </span>
                                ) : (
                                    <span className="text-xs font-bold text-ipn-800">
                                        Anotar →
                                    </span>
                                )}
                            </div>
                        </button>
                    ))}
                </div>
            </main>

            {selected && (
                <RefereeScoreDialog
                    match={selected}
                    slug={slug}
                    pin={pin}
                    open={!!selected}
                    onOpenChange={(o) => !o && setSelected(null)}
                    onSaved={() => loadData(pin)}
                />
            )}
        </div>
    );
}
