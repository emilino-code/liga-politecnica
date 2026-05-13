import { useEffect, useState, useMemo, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { api, formatApiError } from "../lib/api";
import AppHeader from "../components/AppHeader";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from "../components/ui/tabs";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "../components/ui/select";
import { toast } from "sonner";
import {
    ArrowLeft,
    Calendar,
    Clock,
    Plus,
    ExternalLink,
    Trophy,
    RefreshCcw,
    Edit3,
    Eye,
    GitMerge,
    Trash2,
    Flag,
    Copy,
    Eye as EyeIcon,
    EyeOff,
    Handshake,
    Award,
} from "lucide-react";
import TimelineEditor from "../components/TimelineEditor";
import SponsorsEditor from "../components/SponsorsEditor";
import PlayoffSelector from "../components/PlayoffSelector";
import {
    ResultDialog,
    ReagendarDialog,
    JornadaDialog,
} from "../components/MatchDialogs";

export default function TournamentDetail() {
    const { tid } = useParams();
    const nav = useNavigate();
    const [data, setData] = useState(null);
    const [tab, setTab] = useState("organizar");
    const [activeJornada, setActiveJornada] = useState(null);
    const [resultMatch, setResultMatch] = useState(null);
    const [reagendarMatch, setReagendarMatch] = useState(null);
    const [jornadaOpen, setJornadaOpen] = useState(false);

    const load = useCallback(async () => {
        try {
            const { data } = await api.get(`/tournaments/${tid}`);
            setData(data);
        } catch (e) {
            toast.error("No se pudo cargar el torneo");
            nav("/dashboard");
        }
    }, [tid, nav]);

    useEffect(() => {
        load();
    }, [load]);

    if (!data) {
        return (
            <div className="min-h-screen bg-slate-50">
                <AppHeader />
                <div className="p-12 text-center text-slate-500">Cargando…</div>
            </div>
        );
    }

    const { tournament, matches } = data;
    const isLeague = tournament.kind === "league";

    const handleMove = async (matchId, { hora, cancha }) => {
        try {
            await api.patch(`/matches/${matchId}`, { hora, cancha });
            // Optimistic local update
            setData((prev) => ({
                ...prev,
                matches: prev.matches.map((m) =>
                    m.id === matchId ? { ...m, hora, cancha } : m,
                ),
            }));
        } catch (err) {
            toast.error("No se pudo mover el partido");
            load();
        }
    };

    return (
        <div className="min-h-screen bg-slate-50">
            <AppHeader />
            <main className="max-w-7xl mx-auto px-6 py-8">
                <button
                    onClick={() => nav("/dashboard")}
                    className="text-slate-500 hover:text-slate-900 inline-flex items-center gap-1 text-sm mb-6"
                    data-testid="back-dashboard"
                >
                    <ArrowLeft className="w-4 h-4" /> Panel
                </button>

                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                        <span
                            className={`text-xs font-bold uppercase tracking-widest px-2 py-1 rounded-full ${
                                isLeague
                                    ? "bg-ipn-100 text-ipn-900"
                                    : "bg-yellow-100 text-yellow-800"
                            }`}
                        >
                            {isLeague ? "Liga" : "Torneo Rápido"}
                        </span>
                        <h1
                            className="font-display text-3xl lg:text-4xl font-black mt-3"
                            data-testid="tournament-title"
                        >
                            {tournament.name}
                        </h1>
                        <div className="mt-2 text-slate-500 text-sm flex flex-wrap gap-4">
                            <span>{tournament.canchas} canchas</span>
                            <span>·</span>
                            <span>
                                {tournament.categorias?.length || 0} categorías
                            </span>
                            <span>·</span>
                            <span>{tournament.tipo_voley}</span>
                        </div>
                    </div>

                    <div className="flex gap-2 flex-wrap">
                        <RefereePinCard tournamentId={tournament.id} tournament={tournament} />
                        <Link
                            to={`/public/${tournament.slug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 h-11 px-4 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 font-semibold text-sm"
                            data-testid="open-public"
                        >
                            <ExternalLink className="w-4 h-4" />
                            Vista pública
                        </Link>
                    </div>
                </div>

                <Tabs value={tab} onValueChange={setTab} className="mt-8">
                    <TabsList className="bg-white border border-slate-100 rounded-xl p-1 h-12">
                        <TabsTrigger
                            value="organizar"
                            className="rounded-lg h-10 px-4 data-[state=active]:bg-slate-900 data-[state=active]:text-white"
                            data-testid="tab-organizar"
                        >
                            <Calendar className="w-4 h-4 mr-2" />
                            Organizar
                        </TabsTrigger>
                        <TabsTrigger
                            value="edicion"
                            className="rounded-lg h-10 px-4 data-[state=active]:bg-slate-900 data-[state=active]:text-white"
                            data-testid="tab-edicion"
                        >
                            <Edit3 className="w-4 h-4 mr-2" />
                            Edición
                        </TabsTrigger>
                        {isLeague && (
                            <TabsTrigger
                                value="reagendar"
                                className="rounded-lg h-10 px-4 data-[state=active]:bg-slate-900 data-[state=active]:text-white"
                                data-testid="tab-reagendar"
                            >
                                <GitMerge className="w-4 h-4 mr-2" />
                                Reagendar
                            </TabsTrigger>
                        )}
                        {isLeague && (
                            <TabsTrigger
                                value="playoffs"
                                className="rounded-lg h-10 px-4 data-[state=active]:bg-slate-900 data-[state=active]:text-white"
                                data-testid="tab-playoffs"
                            >
                                <Award className="w-4 h-4 mr-2" />
                                Playoffs
                            </TabsTrigger>
                        )}
                        <TabsTrigger
                            value="patrocinios"
                            className="rounded-lg h-10 px-4 data-[state=active]:bg-slate-900 data-[state=active]:text-white"
                            data-testid="tab-patrocinios"
                        >
                            <Handshake className="w-4 h-4 mr-2" />
                            Patrocinios
                        </TabsTrigger>
                        <TabsTrigger
                            value="vista"
                            className="rounded-lg h-10 px-4 data-[state=active]:bg-slate-900 data-[state=active]:text-white"
                            data-testid="tab-vista"
                        >
                            <Eye className="w-4 h-4 mr-2" />
                            Vista previa
                        </TabsTrigger>
                    </TabsList>

                    {/* ORGANIZAR */}
                    <TabsContent value="organizar" className="mt-6">
                        <OrganizarTab
                            tournament={tournament}
                            matches={matches}
                            isLeague={isLeague}
                            activeJornada={activeJornada}
                            setActiveJornada={setActiveJornada}
                            setResultMatch={setResultMatch}
                            onCreateJornada={() => setJornadaOpen(true)}
                            onDeleteJornada={async (jid) => {
                                if (!window.confirm("¿Eliminar jornada?"))
                                    return;
                                try {
                                    await api.delete(
                                        `/tournaments/${tournament.id}/jornadas/${jid}`,
                                    );
                                    toast.success("Jornada eliminada");
                                    load();
                                } catch (err) {
                                    toast.error(
                                        formatApiError(err.response?.data?.detail),
                                    );
                                }
                            }}
                        />
                    </TabsContent>

                    {/* EDICION */}
                    <TabsContent value="edicion" className="mt-6">
                        <EdicionTab
                            tournament={tournament}
                            matches={matches}
                            isLeague={isLeague}
                            activeJornada={activeJornada}
                            setActiveJornada={setActiveJornada}
                            onMove={handleMove}
                            onRecalcular={async (n) => {
                                try {
                                    await api.post(
                                        `/tournaments/${tournament.id}/recalcular`,
                                        { nuevas_canchas: n },
                                    );
                                    toast.success(
                                        "Rol recalculado (solo partidos no jugados)",
                                    );
                                    load();
                                } catch (err) {
                                    toast.error(
                                        formatApiError(err.response?.data?.detail),
                                    );
                                }
                            }}
                        />
                    </TabsContent>

                    {/* REAGENDAR */}
                    {isLeague && (
                        <TabsContent value="reagendar" className="mt-6">
                            <ReagendarTab
                                tournament={tournament}
                                matches={matches}
                                onReagendar={(m) => setReagendarMatch(m)}
                            />
                        </TabsContent>
                    )}

                    {/* VISTA PREVIA */}
                    <TabsContent value="vista" className="mt-6">
                        <VistaPreviaTab tournament={tournament} matches={matches} />
                    </TabsContent>

                    {/* PATROCINIOS */}
                    <TabsContent value="patrocinios" className="mt-6">
                        <SponsorsEditor tournamentId={tournament.id} />
                    </TabsContent>

                    {/* PLAYOFFS (solo Liga) */}
                    {isLeague && (
                        <TabsContent value="playoffs" className="mt-6">
                            <PlayoffSelector
                                tournament={tournament}
                                matches={matches}
                                onSaved={load}
                            />
                        </TabsContent>
                    )}
                </Tabs>

                {resultMatch && (
                    <ResultDialog
                        match={resultMatch}
                        open={!!resultMatch}
                        onOpenChange={(o) => !o && setResultMatch(null)}
                        onSaved={load}
                    />
                )}
                {reagendarMatch && (
                    <ReagendarDialog
                        match={reagendarMatch}
                        jornadas={tournament.jornadas || []}
                        open={!!reagendarMatch}
                        onOpenChange={(o) => !o && setReagendarMatch(null)}
                        onSaved={load}
                    />
                )}
                {jornadaOpen && (
                    <JornadaDialog
                        tournament={tournament}
                        open={jornadaOpen}
                        onOpenChange={setJornadaOpen}
                        onSaved={load}
                    />
                )}
            </main>
        </div>
    );
}

function OrganizarTab({
    tournament,
    matches,
    isLeague,
    activeJornada,
    setActiveJornada,
    setResultMatch,
    onCreateJornada,
    onDeleteJornada,
}) {
    const jornadas = tournament.jornadas || [];

    if (isLeague) {
        return (
            <div className="space-y-6">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                    <div>
                        <h2 className="font-display text-xl font-bold">
                            Jornadas
                        </h2>
                        <p className="text-sm text-slate-500">
                            Programa una nueva jornada eligiendo qué rama
                            juega.
                        </p>
                    </div>
                    <Button
                        onClick={onCreateJornada}
                        className="h-11 rounded-xl bg-ipn-800 hover:bg-ipn-900 font-bold"
                        data-testid="add-jornada"
                    >
                        <Plus className="w-4 h-4 mr-1" />
                        Nueva jornada
                    </Button>
                </div>

                {jornadas.length === 0 && (
                    <div className="vp-card p-10 text-center">
                        <Calendar className="w-10 h-10 mx-auto text-ipn-800" />
                        <h3 className="mt-4 font-display text-xl font-bold">
                            Aún no programas ninguna jornada
                        </h3>
                        <p className="mt-2 text-slate-500 text-sm">
                            Tienes una bolsa de partidos en borrador esperando
                            ser programados.
                        </p>
                    </div>
                )}

                <div className="grid gap-4">
                    {jornadas.map((j) => {
                        const jm = matches.filter((m) => m.jornada_id === j.id);
                        return (
                            <div key={j.id} className="vp-card p-6">
                                <div className="flex items-start justify-between gap-4 flex-wrap">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span
                                                className={`text-xs font-bold uppercase px-2 py-1 rounded-full ${
                                                    j.modo === "mixto"
                                                        ? "bg-purple-100 text-purple-700"
                                                        : j.modo === "femenil"
                                                          ? "bg-rose-100 text-rose-700"
                                                          : "bg-ipn-100 text-ipn-900"
                                                }`}
                                            >
                                                {j.modo}
                                            </span>
                                            <h3 className="font-display font-bold text-lg">
                                                {j.fecha}
                                            </h3>
                                        </div>
                                        <p className="text-sm text-slate-500 mt-1">
                                            {jm.length} partidos · {j.hora_inicio}
                                            –{j.hora_fin}
                                        </p>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setActiveJornada(j.id)}
                                            className="rounded-xl"
                                            data-testid={`jornada-edit-${j.id}`}
                                        >
                                            <Edit3 className="w-3 h-3 mr-1" />
                                            Editar
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => onDeleteJornada(j.id)}
                                            className="rounded-xl text-rose-600 hover:bg-rose-50 hover:text-rose-700 border-rose-100"
                                            data-testid={`jornada-delete-${j.id}`}
                                        >
                                            <Trash2 className="w-3 h-3" />
                                        </Button>
                                    </div>
                                </div>

                                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {jm.map((m) => (
                                        <MatchRow
                                            key={m.id}
                                            match={m}
                                            onClick={() => setResultMatch(m)}
                                        />
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Drafts */}
                <div className="vp-card p-6">
                    <h3 className="font-display text-lg font-bold mb-3">
                        Bolsa de partidos pendientes
                    </h3>
                    <DraftBag matches={matches} />
                </div>
            </div>
        );
    }

    // Quick tournament: agrupar por categoría
    return <QuickOrganizar tournament={tournament} matches={matches} setResultMatch={setResultMatch} />;
}

function QuickOrganizar({ tournament, matches, setResultMatch }) {
    return (
        <div className="space-y-6">
            {tournament.categorias.map((cat) => {
                const cm = matches
                    .filter((m) => m.category_id === cat.id)
                    .sort((a, b) => (a.hora || "").localeCompare(b.hora || ""));
                return (
                    <div key={cat.id} className="vp-card p-6">
                        <div className="flex items-center gap-2">
                            <span
                                className={`text-xs font-bold uppercase px-2 py-1 rounded-full ${
                                    cat.rama === "femenil"
                                        ? "bg-rose-100 text-rose-700"
                                        : "bg-ipn-100 text-ipn-900"
                                }`}
                            >
                                {cat.rama}
                            </span>
                            <h3 className="font-display font-bold text-lg">
                                {cat.nombre}
                            </h3>
                            <span className="text-xs text-slate-500 ml-auto">
                                {cm.length} partidos
                            </span>
                        </div>
                        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                            {cm.map((m) => (
                                <MatchRow
                                    key={m.id}
                                    match={m}
                                    onClick={() => setResultMatch(m)}
                                />
                            ))}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

function MatchRow({ match, onClick }) {
    const played = match.status === "played";
    return (
        <button
            onClick={onClick}
            className={`text-left p-4 rounded-xl border transition-all ${
                played
                    ? "bg-emerald-50 border-emerald-200"
                    : "bg-white border-slate-200 hover:border-ipn-300 hover:shadow-sm"
            }`}
            data-testid={`match-row-${match.id}`}
        >
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-widest text-slate-400">
                <span>
                    {match.hora || "—"} · Cancha {match.cancha}
                </span>
                <span>{match.fase}</span>
            </div>
            <div className="mt-2 font-semibold flex items-center justify-between gap-2">
                <span className="truncate">{match.local}</span>
                <span className="text-slate-400">vs</span>
                <span className="truncate text-right">{match.visitante}</span>
            </div>
            <div className="mt-2 text-xs text-slate-500 flex items-center justify-between">
                <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        match.branch === "femenil"
                            ? "bg-rose-100 text-rose-700"
                            : "bg-ipn-100 text-ipn-900"
                    }`}
                >
                    {match.branch}
                </span>
                <span className="font-bold">
                    {played ? `Final: ${match.score}` : "Pendiente"}
                </span>
            </div>
        </button>
    );
}

function DraftBag({ matches }) {
    const drafts = matches.filter((m) => m.status === "draft");
    if (drafts.length === 0)
        return (
            <p className="text-sm text-slate-500">
                No hay partidos en borrador. Todos están programados.
            </p>
        );
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {drafts.slice(0, 60).map((m) => (
                <div
                    key={m.id}
                    className={`p-3 rounded-xl border ${
                        m.branch === "femenil"
                            ? "bg-rose-50 border-rose-200"
                            : "bg-ipn-50 border-ipn-200"
                    }`}
                    data-testid={`draft-${m.id}`}
                >
                    <div className="text-[10px] uppercase font-bold opacity-60">
                        {m.branch} · {m.fase}
                    </div>
                    <div className="mt-1 text-sm font-semibold">
                        {m.local} vs {m.visitante}
                    </div>
                </div>
            ))}
            {drafts.length > 60 && (
                <div className="text-xs text-slate-500 col-span-full">
                    + {drafts.length - 60} más…
                </div>
            )}
        </div>
    );
}

function EdicionTab({
    tournament,
    matches,
    isLeague,
    activeJornada,
    setActiveJornada,
    onMove,
    onRecalcular,
}) {
    const [nuevasCanchas, setNuevasCanchas] = useState(tournament.canchas);

    // For league: pick a jornada; for quick: show all
    const jornadas = tournament.jornadas || [];
    const selJornada =
        isLeague && jornadas.length > 0
            ? jornadas.find((j) => j.id === activeJornada) || jornadas[0]
            : null;

    let timelineMatches = matches;
    let courts, tStart, tEnd, tDur;

    if (isLeague) {
        if (!selJornada) {
            return (
                <div className="vp-card p-10 text-center text-slate-500">
                    Aún no hay jornadas. Ve a "Organizar" y crea una.
                </div>
            );
        }
        timelineMatches = matches.filter((m) => m.jornada_id === selJornada.id);
        courts = selJornada.canchas;
        tStart = selJornada.hora_inicio;
        tEnd = selJornada.hora_fin;
        tDur = tournament.duracion_bloque;
    } else {
        timelineMatches = matches;
        courts = tournament.canchas;
        tStart = tournament.hora_inicio;
        // estimate end ~ 8 hours after start
        const [h, mm] = tournament.hora_inicio.split(":").map(Number);
        const endH = (h + 10) % 24;
        tEnd = `${String(endH).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
        tDur = tournament.duracion_bloque;
    }

    return (
        <div className="space-y-6">
            <div className="vp-card p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <h3 className="font-display text-lg font-bold">
                        Cambiar canchas
                    </h3>
                    <p className="text-sm text-slate-500">
                        Reagenda solo los partidos no jugados.
                    </p>
                    <div className="mt-3 flex gap-2">
                        <Input
                            type="number"
                            min={1}
                            value={nuevasCanchas}
                            onChange={(e) =>
                                setNuevasCanchas(parseInt(e.target.value) || 1)
                            }
                            className="h-11 rounded-xl w-24"
                            data-testid="recalc-courts"
                        />
                        <Button
                            onClick={() => onRecalcular(nuevasCanchas)}
                            className="h-11 rounded-xl bg-ipn-800 hover:bg-ipn-900 font-bold"
                            data-testid="recalc-submit"
                        >
                            <RefreshCcw className="w-4 h-4 mr-2" />
                            Recalcular
                        </Button>
                    </div>
                </div>

                {isLeague && (
                    <div>
                        <h3 className="font-display text-lg font-bold">
                            Jornada en edición
                        </h3>
                        <p className="text-sm text-slate-500">
                            Selecciona qué jornada quieres reorganizar.
                        </p>
                        <Select
                            value={selJornada.id}
                            onValueChange={setActiveJornada}
                        >
                            <SelectTrigger
                                className="h-11 rounded-xl mt-3"
                                data-testid="edicion-jornada-select"
                            >
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {jornadas.map((j) => (
                                    <SelectItem key={j.id} value={j.id}>
                                        {j.fecha} · {j.modo}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                )}
            </div>

            <TimelineEditor
                matches={timelineMatches}
                numCourts={courts}
                startTime={tStart}
                endTime={tEnd}
                duration={tDur}
                onMove={onMove}
            />
        </div>
    );
}

function ReagendarTab({ tournament, matches, onReagendar }) {
    const teamsWithCount = useMemo(() => {
        const out = [];
        tournament.categorias.forEach((c) => {
            (c.teams || []).forEach((t) => {
                out.push({
                    name: t.nombre,
                    institucion: t.institucion,
                    rama: c.rama,
                    categoria: c.nombre,
                    reagendados: t.reagendados || 0,
                });
            });
        });
        return out;
    }, [tournament]);

    const scheduled = matches.filter(
        (m) => m.status === "scheduled" && m.jornada_id,
    );

    return (
        <div className="space-y-6">
            <div className="vp-card p-6">
                <h3 className="font-display text-lg font-bold">
                    Comodines por equipo (máx 2)
                </h3>
                <p className="text-sm text-slate-500 mb-4">
                    El sistema descuenta automáticamente al reagendar.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {teamsWithCount.map((t, i) => (
                        <div
                            key={i}
                            className="p-4 rounded-xl border border-slate-200 flex items-center justify-between"
                            data-testid={`team-counter-${i}`}
                        >
                            <div className="min-w-0">
                                <div className="font-bold truncate">
                                    {t.name}
                                </div>
                                <div className="text-xs text-slate-500 truncate">
                                    {t.categoria} · {t.rama}
                                </div>
                            </div>
                            <div
                                className={`text-xs font-bold px-2 py-1 rounded-full ${
                                    t.reagendados >= 2
                                        ? "bg-rose-100 text-rose-700"
                                        : t.reagendados === 1
                                          ? "bg-yellow-100 text-yellow-800"
                                          : "bg-emerald-100 text-emerald-700"
                                }`}
                            >
                                {t.reagendados}/2
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="vp-card p-6">
                <h3 className="font-display text-lg font-bold">
                    Partidos programados
                </h3>
                <p className="text-sm text-slate-500 mb-4">
                    Click "Reagendar" para enviar a la bolsa o a otra jornada.
                </p>
                <div className="space-y-2">
                    {scheduled.length === 0 && (
                        <div className="text-sm text-slate-500">
                            No hay partidos programados aún.
                        </div>
                    )}
                    {scheduled.map((m) => (
                        <div
                            key={m.id}
                            className="flex items-center gap-3 justify-between p-3 rounded-xl bg-slate-50 border border-slate-100"
                            data-testid={`reagendar-row-${m.id}`}
                        >
                            <div className="text-sm flex-1 min-w-0">
                                <div className="font-bold truncate">
                                    {m.local} vs {m.visitante}
                                </div>
                                <div className="text-xs text-slate-500">
                                    {m.hora} · Cancha {m.cancha} · {m.branch}
                                </div>
                            </div>
                            <Button
                                size="sm"
                                onClick={() => onReagendar(m)}
                                className="rounded-xl bg-ipn-800 hover:bg-ipn-900"
                                data-testid={`reagendar-btn-${m.id}`}
                            >
                                Reagendar
                            </Button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

function VistaPreviaTab({ tournament, matches }) {
    const total = matches.length;
    const drafts = matches.filter((m) => m.status === "draft").length;
    const scheduled = matches.filter((m) => m.status === "scheduled").length;
    const played = matches.filter((m) => m.status === "played").length;

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 vp-card p-6">
                <h3 className="font-display text-lg font-bold mb-4">
                    Configuración del torneo
                </h3>
                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                    <Pair k="Tipo" v={tournament.kind === "league" ? "Liga" : "Torneo Rápido"} />
                    <Pair k="Voley" v={tournament.tipo_voley} />
                    <Pair k="Canchas globales" v={tournament.canchas} />
                    <Pair k="Hora inicio" v={tournament.hora_inicio} />
                    {tournament.hora_fin && (
                        <Pair k="Hora fin" v={tournament.hora_fin} />
                    )}
                    <Pair
                        k="Duración por partido"
                        v={`${tournament.duracion_bloque} min`}
                    />
                    {tournament.kind === "league" && (
                        <>
                            <Pair
                                k="Días por semana"
                                v={tournament.dias_por_semana}
                            />
                            <Pair k="Días" v={(tournament.dias || []).join(", ")} />
                            <Pair
                                k="Ida y vuelta"
                                v={tournament.ida_y_vuelta ? "Sí" : "No"}
                            />
                            <Pair
                                k="Formato playoff"
                                v={tournament.formato_playoff || "Por decidir"}
                            />
                        </>
                    )}
                </dl>

                <h3 className="font-display text-lg font-bold mt-8 mb-4">
                    Categorías
                </h3>
                <div className="space-y-2">
                    {tournament.categorias.map((c) => (
                        <div
                            key={c.id}
                            className="p-4 rounded-xl bg-slate-50 border border-slate-100"
                        >
                            <div className="flex items-center justify-between">
                                <div>
                                    <span
                                        className={`text-xs font-bold uppercase px-2 py-0.5 rounded-full ${
                                            c.rama === "femenil"
                                                ? "bg-rose-100 text-rose-700"
                                                : "bg-ipn-100 text-ipn-900"
                                        }`}
                                    >
                                        {c.rama}
                                    </span>
                                    <span className="font-bold ml-2">
                                        {c.nombre}
                                    </span>
                                </div>
                                <span className="text-sm text-slate-500">
                                    {c.teams?.length || 0} equipos · {c.formato}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="space-y-4">
                <div className="vp-card p-6">
                    <Trophy className="w-6 h-6 text-ipn-800" />
                    <div className="mt-3 text-3xl font-display font-black">
                        {total}
                    </div>
                    <div className="text-sm text-slate-500">
                        partidos en total
                    </div>
                </div>
                <div className="vp-card p-6">
                    <Clock className="w-6 h-6 text-yellow-500" />
                    <div className="mt-3 text-3xl font-display font-black">
                        {drafts}
                    </div>
                    <div className="text-sm text-slate-500">en borrador</div>
                </div>
                <div className="vp-card p-6">
                    <Calendar className="w-6 h-6 text-ipn-800" />
                    <div className="mt-3 text-3xl font-display font-black">
                        {scheduled}
                    </div>
                    <div className="text-sm text-slate-500">programados</div>
                </div>
                <div className="vp-card p-6">
                    <Trophy className="w-6 h-6 text-emerald-500" />
                    <div className="mt-3 text-3xl font-display font-black">
                        {played}
                    </div>
                    <div className="text-sm text-slate-500">jugados</div>
                </div>
            </div>
        </div>
    );
}

function Pair({ k, v }) {
    return (
        <div>
            <dt className="text-xs uppercase font-bold tracking-widest text-slate-400">
                {k}
            </dt>
            <dd className="mt-1 font-semibold">{v ?? "—"}</dd>
        </div>
    );
}

function RefereePinCard({ tournamentId, tournament }) {
    const [pin, setPin] = useState(null);
    const [show, setShow] = useState(false);
    const [open, setOpen] = useState(false);
    const slug = tournament?.slug || "";
    const refereeUrl = `${window.location.origin}/arbitro?code=${slug}`;

    useEffect(() => {
        (async () => {
            try {
                const { data } = await api.get(
                    `/tournaments/${tournamentId}/referee-pin`,
                );
                setPin(data.pin);
            } catch {}
        })();
    }, [tournamentId]);

    const rotate = async () => {
        try {
            const { data } = await api.post(
                `/tournaments/${tournamentId}/referee-pin`,
            );
            setPin(data.pin);
            toast.success("PIN regenerado");
        } catch {
            toast.error("No se pudo regenerar el PIN");
        }
    };

    const copyPin = () => {
        if (!pin) return;
        navigator.clipboard?.writeText(pin);
        toast.success("PIN copiado");
    };

    const copyCode = () => {
        navigator.clipboard?.writeText(slug);
        toast.success("Código copiado");
    };

    const shareAll = () => {
        if (!pin) return;
        const text = `🏐 Acceso de árbitro · ${tournament?.name || "Torneo"}

Entra aquí: ${refereeUrl}

Código del torneo: ${slug}
PIN: ${pin}`;
        navigator.clipboard?.writeText(text);
        toast.success("Instrucciones copiadas — pégalas en WhatsApp");
    };

    return (
        <div className="relative">
            <button
                onClick={() => setOpen(!open)}
                className="inline-flex items-center gap-2 h-11 px-4 rounded-xl bg-ipnYellow hover:bg-ipnYellow-600 text-ipn-950 font-bold text-sm"
                data-testid="open-referee-pin"
            >
                <Flag className="w-4 h-4" />
                PIN árbitros
            </button>
            {open && (
                <div className="absolute right-0 mt-2 w-96 vp-card p-4 z-50 shadow-lg">
                    <p className="text-xs font-bold uppercase tracking-widest text-slate-500">
                        Acceso de árbitros
                    </p>

                    {/* Código del torneo */}
                    <div className="mt-3">
                        <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">
                            Código del torneo
                        </div>
                        <div className="flex items-center gap-2">
                            <div
                                className="flex-1 font-mono text-sm font-bold bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 truncate"
                                data-testid="referee-code-value"
                                title={slug}
                            >
                                {slug}
                            </div>
                            <button
                                onClick={copyCode}
                                className="h-10 w-10 rounded-xl border border-slate-200 grid place-items-center hover:bg-slate-50"
                                title="Copiar código"
                                data-testid="copy-code"
                            >
                                <Copy className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    {/* PIN */}
                    <div className="mt-4">
                        <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">
                            PIN (4 dígitos)
                        </div>
                        <div className="flex items-center gap-2">
                            <div
                                className="flex-1 text-center font-mono text-3xl font-black bg-ipn-50 rounded-xl py-3 tracking-[0.3em] text-ipn-900"
                                data-testid="referee-pin-value"
                            >
                                {show ? pin || "…" : "••••"}
                            </div>
                            <button
                                onClick={() => setShow(!show)}
                                className="h-11 w-11 rounded-xl border border-slate-200 grid place-items-center hover:bg-slate-50"
                                title={show ? "Ocultar" : "Mostrar"}
                                data-testid="toggle-pin-visibility"
                            >
                                {show ? (
                                    <EyeOff className="w-4 h-4" />
                                ) : (
                                    <EyeIcon className="w-4 h-4" />
                                )}
                            </button>
                            <button
                                onClick={copyPin}
                                className="h-11 w-11 rounded-xl border border-slate-200 grid place-items-center hover:bg-slate-50"
                                title="Copiar PIN"
                                data-testid="copy-pin"
                            >
                                <Copy className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    {/* Acciones */}
                    <div className="mt-4 flex gap-2">
                        <Button
                            size="sm"
                            onClick={shareAll}
                            className="rounded-xl flex-1 bg-ipn-800 hover:bg-ipn-900 font-bold"
                            data-testid="share-access"
                        >
                            <Copy className="w-3 h-3 mr-1" />
                            Compartir acceso
                        </Button>
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={rotate}
                            className="rounded-xl"
                            data-testid="rotate-pin"
                            title="Regenerar PIN"
                        >
                            <RefreshCcw className="w-3 h-3" />
                        </Button>
                    </div>

                    <p className="text-xs text-slate-500 mt-3 leading-relaxed">
                        Los árbitros entran en <code className="font-mono text-ipn-800">/arbitro</code> y meten{" "}
                        <strong>código</strong> + <strong>PIN</strong>. Si
                        regeneras el PIN, el anterior deja de funcionar.
                    </p>
                </div>
            )}
        </div>
    );
}

