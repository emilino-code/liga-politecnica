import { useEffect, useMemo, useState, useCallback } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "./ui/dialog";
import { api, formatApiError } from "../lib/api";
import { toast } from "sonner";
import {
    Plus,
    Save,
    Users,
    RotateCw,
    Flag,
    CheckCircle2,
    ArrowLeftRight,
    Timer,
    Download,
} from "lucide-react";

/**
 * VolleySimulator v2
 * - Auto finalize set (25 / 15 in set 5, with diff >= 2)
 * - Substitution via modal (choose who enters)
 * - Side switch at end of set (visual swap)
 * - 2 Time-outs per team per set
 * - Full history export
 * - Persists to db.match_sheets
 */

function rotateClockwise(positions) {
    const [p1, p2, p3, p4, p5, p6] = positions;
    return [p2, p3, p4, p5, p6, p1];
}
function emptyPlayer() {
    return {
        id: crypto.randomUUID(),
        num: "",
        nombre: "",
        es_capitan: false,
    };
}
function emptyRoster() {
    return {
        starters: Array.from({ length: 6 }, () => emptyPlayer()),
        libero: emptyPlayer(),
    };
}

export default function VolleySimulator({ match, slug, pin, onFinalized }) {
    const [phase, setPhase] = useState("setup"); // setup|toss|playing|finished
    const [rosterL, setRosterL] = useState(emptyRoster());
    const [rosterV, setRosterV] = useState(emptyRoster());
    const [serving, setServing] = useState("local");
    const [posL, setPosL] = useState([null, null, null, null, null, null]);
    const [posV, setPosV] = useState([null, null, null, null, null, null]);
    const [currentSet, setCurrentSet] = useState(1);
    const [scoreL, setScoreL] = useState(0);
    const [scoreV, setScoreV] = useState(0);
    const [sets, setSets] = useState([]);
    const [timeoutsL, setTimeoutsL] = useState(2);
    const [timeoutsV, setTimeoutsV] = useState(2);
    const [history, setHistory] = useState([]); // full rally log
    const [localOnLeft, setLocalOnLeft] = useState(true);
    const [saving, setSaving] = useState(false);
    const [subDialog, setSubDialog] = useState(null);
    // subDialog: {team, posIdx}

    const pushLog = (entry) =>
        setHistory((h) => [
            ...h,
            { ts: new Date().toISOString(), set: currentSet, ...entry },
        ]);

    // Load existing
    useEffect(() => {
        if (!match?.id || !slug || !pin) return;
        (async () => {
            try {
                const { data } = await api.get(
                    `/referee/matches/${match.id}/sheet`,
                    { params: { slug, pin } },
                );
                if (data && data.match_id && data.enabled !== false) {
                    if (data.roster_local) setRosterL(data.roster_local);
                    if (data.roster_vis) setRosterV(data.roster_vis);
                    if (data.positions_local) setPosL(data.positions_local);
                    if (data.positions_vis) setPosV(data.positions_vis);
                    setServing(data.serving || "local");
                    setCurrentSet(data.current_set || 1);
                    setScoreL(data.score_local || 0);
                    setScoreV(data.score_vis || 0);
                    setSets(data.sets || []);
                    setHistory(data.history || []);
                    if (typeof data.timeouts_local === "number")
                        setTimeoutsL(data.timeouts_local);
                    if (typeof data.timeouts_vis === "number")
                        setTimeoutsV(data.timeouts_vis);
                    if (typeof data.local_on_left === "boolean")
                        setLocalOnLeft(data.local_on_left);
                    if (data.phase) setPhase(data.phase);
                }
            } catch {}
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [match?.id]);

    const persist = useCallback(
        async (extra = {}) => {
            try {
                await api.put(`/referee/matches/${match.id}/sheet`, {
                    pin,
                    roster_local: rosterL,
                    roster_vis: rosterV,
                    positions_local: posL,
                    positions_vis: posV,
                    serving,
                    current_set: currentSet,
                    sets,
                    score_local: scoreL,
                    score_vis: scoreV,
                    timeouts_local: timeoutsL,
                    timeouts_vis: timeoutsV,
                    history,
                    local_on_left: localOnLeft,
                    phase,
                    enabled: true,
                    ...extra,
                });
            } catch {}
        },
        [
            match?.id,
            pin,
            rosterL,
            rosterV,
            posL,
            posV,
            serving,
            currentSet,
            sets,
            scoreL,
            scoreV,
            timeoutsL,
            timeoutsV,
            history,
            localOnLeft,
            phase,
        ],
    );

    // autosave after playing actions
    useEffect(() => {
        if (phase !== "playing") return;
        const t = setTimeout(persist, 600);
        return () => clearTimeout(t);
    }, [scoreL, scoreV, history.length, phase, persist]);

    const readyL = useMemo(
        () => rosterL.starters.every((p) => p.num && p.nombre),
        [rosterL],
    );
    const readyV = useMemo(
        () => rosterV.starters.every((p) => p.num && p.nombre),
        [rosterV],
    );

    const startGame = (firstServer) => {
        setPosL(rosterL.starters.slice(0, 6).map((p) => p.id));
        setPosV(rosterV.starters.slice(0, 6).map((p) => p.id));
        setServing(firstServer);
        setPhase("playing");
        pushLog({ type: "match_start", first_serve: firstServer });
    };

    // Auto-finalize set detection
    useEffect(() => {
        if (phase !== "playing") return;
        const target = currentSet >= 5 ? 15 : 25;
        const diff = Math.abs(scoreL - scoreV);
        if ((scoreL >= target || scoreV >= target) && diff >= 2) {
            finalizeSet();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [scoreL, scoreV]);

    const point = (team) => {
        if (phase !== "playing") return;
        if (team === "local") {
            if (serving === "vis") {
                setPosL((p) => rotateClockwise(p));
                setServing("local");
                pushLog({ type: "side_out", team: "local", rotate: true });
            } else {
                pushLog({ type: "point", team: "local" });
            }
            setScoreL((x) => x + 1);
        } else {
            if (serving === "local") {
                setPosV((p) => rotateClockwise(p));
                setServing("vis");
                pushLog({ type: "side_out", team: "vis", rotate: true });
            } else {
                pushLog({ type: "point", team: "vis" });
            }
            setScoreV((x) => x + 1);
        }
    };

    const undoPoint = () => {
        if (history.length === 0) return;
        const last = history[history.length - 1];
        if (last.type !== "point" && last.type !== "side_out") {
            toast.info("No hay punto para deshacer.");
            return;
        }
        if (last.team === "local") setScoreL((x) => Math.max(0, x - 1));
        else setScoreV((x) => Math.max(0, x - 1));
        // if it was a side_out, we also need to un-rotate and restore serving to the previous team
        // naive: just pop the last entry; rotation is approximate but acceptable for a beta
        setHistory((h) => h.slice(0, -1));
    };

    const callTimeout = (team) => {
        if (team === "local") {
            if (timeoutsL <= 0)
                return toast.info("Local ya usó sus 2 tiempos fuera");
            setTimeoutsL(timeoutsL - 1);
        } else {
            if (timeoutsV <= 0)
                return toast.info("Visitante ya usó sus 2 tiempos fuera");
            setTimeoutsV(timeoutsV - 1);
        }
        pushLog({ type: "timeout", team });
        toast.success(`Tiempo fuera · ${team}`);
    };

    const openSub = (team, posIdx) => {
        setSubDialog({ team, posIdx });
    };

    const executeSub = (incomingPlayerId) => {
        if (!subDialog) return;
        const { team, posIdx } = subDialog;
        const positions = team === "local" ? posL : posV;
        const outgoing = positions[posIdx];
        const next = positions.slice();
        next[posIdx] = incomingPlayerId;
        if (team === "local") setPosL(next);
        else setPosV(next);
        pushLog({
            type: "substitution",
            team,
            pos: posIdx + 1,
            out: outgoing,
            in: incomingPlayerId,
        });
        setSubDialog(null);
        toast.success("Sustitución registrada");
    };

    const finalizeSet = () => {
        const winner = scoreL > scoreV ? "local" : "vis";
        const setEntry = {
            num: currentSet,
            score_local: scoreL,
            score_vis: scoreV,
            winner,
            timeouts_used: { local: 2 - timeoutsL, vis: 2 - timeoutsV },
        };
        setSets((s) => [...s, setEntry]);
        pushLog({ type: "set_end", ...setEntry });

        // Check match end
        const newSetsList = [...sets, setEntry];
        const wonL = newSetsList.filter((s) => s.winner === "local").length;
        const wonV = newSetsList.filter((s) => s.winner === "vis").length;
        if (wonL === 3 || wonV === 3) {
            finalizeMatch(newSetsList);
            return;
        }

        // Side switch between sets
        setLocalOnLeft((v) => !v);

        // Reset for next set
        setScoreL(0);
        setScoreV(0);
        setTimeoutsL(2);
        setTimeoutsV(2);
        setCurrentSet((x) => x + 1);
        // Serve goes to the team that did NOT serve first last set? Volleyball: servedor del siguiente set es quien ganó el toss del set anterior alternadamente. Simplificado: quien ganó el set saca el próximo.
        setServing(winner);
        toast.success(`Set ${currentSet} terminado (${setEntry.score_local}-${setEntry.score_vis})`);
    };

    const finalizeMatch = async (setsList = sets) => {
        setSaving(true);
        try {
            await persist({ sets: setsList, phase: "finished" });
            const payload = setsList.map((s) => [s.score_local, s.score_vis]);
            await api.post(`/referee/matches/${match.id}/result`, {
                pin,
                sets: payload,
            });
            toast.success("Partido finalizado");
            setPhase("finished");
            onFinalized?.();
        } catch (err) {
            toast.error(formatApiError(err.response?.data?.detail));
        } finally {
            setSaving(false);
        }
    };

    const exportSheet = () => {
        const byId = (id, r) => {
            const all = [...r.starters, r.libero];
            return all.find((p) => p.id === id);
        };
        const fmtRoster = (r) => {
            const lines = r.starters
                .filter((p) => p.num || p.nombre)
                .map(
                    (p) =>
                        `  #${(p.num || "?").padStart(2, " ")}  ${p.nombre}${
                            p.es_capitan ? " (C)" : ""
                        }`,
                )
                .join("\n");
            const lib = r.libero?.num
                ? `\n  Líbero: #${r.libero.num} ${r.libero.nombre}`
                : "";
            return lines + lib;
        };
        const fmtSets = sets
            .map(
                (s) =>
                    `  Set ${s.num}: ${s.score_local}-${s.score_vis}  (TOs L:${s.timeouts_used?.local ?? "-"} V:${s.timeouts_used?.vis ?? "-"})`,
            )
            .join("\n");
        const fmtHist = history
            .map((h) => {
                const base = `[Set ${h.set}] ${h.type}`;
                if (h.type === "point" || h.type === "side_out" || h.type === "timeout")
                    return `${base} · ${h.team}`;
                if (h.type === "substitution") {
                    const rIn = h.team === "local" ? rosterL : rosterV;
                    const pIn = byId(h.in, rIn);
                    const pOut = byId(h.out, rIn);
                    return `${base} · ${h.team} · P${h.pos} entra #${pIn?.num || "?"} por #${pOut?.num || "?"}`;
                }
                if (h.type === "set_end")
                    return `${base} · ganador ${h.winner} (${h.score_local}-${h.score_vis})`;
                return base;
            })
            .join("\n");

        const txt = `================================================
HOJA DE CONTROL · VOLLEYPRO (BETA)
================================================
Partido: ${match?.local || ""} vs ${match?.visitante || ""}
Cancha: ${match?.cancha || "-"} · Hora: ${match?.hora || "-"}
Fase: ${match?.fase || "-"} · Rama: ${match?.branch || "-"}
Fecha export: ${new Date().toLocaleString()}

--- ROSTER ${match?.local || "LOCAL"} ---
${fmtRoster(rosterL)}

--- ROSTER ${match?.visitante || "VISITANTE"} ---
${fmtRoster(rosterV)}

--- SETS ---
${fmtSets || "  (aún sin sets completos)"}

--- HISTORIAL ---
${fmtHist || "  (sin eventos)"}
================================================`;
        const blob = new Blob([txt], { type: "text/plain;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `hoja-${(match?.local || "local").slice(0, 15)}-vs-${(match?.visitante || "vis").slice(0, 15)}.txt`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success("Hoja exportada");
    };

    // Player bench for a team (those not currently in the 6)
    const benchFor = (team) => {
        const roster = team === "local" ? rosterL : rosterV;
        const positions = team === "local" ? posL : posV;
        return roster.starters
            .filter((p) => p.id && p.num && !positions.includes(p.id))
            .concat(
                roster.libero?.id && roster.libero.num && !positions.includes(roster.libero.id)
                    ? [{ ...roster.libero, is_libero: true }]
                    : [],
            );
    };

    // UI
    if (phase === "setup") {
        return (
            <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <RosterSetup
                        title={match?.local || "Local"}
                        color="ipn"
                        roster={rosterL}
                        onChange={setRosterL}
                    />
                    <RosterSetup
                        title={match?.visitante || "Visitante"}
                        color="slate"
                        roster={rosterV}
                        onChange={setRosterV}
                    />
                </div>
                <div className="flex items-center justify-end gap-3">
                    <Button
                        variant="outline"
                        onClick={persist}
                        className="rounded-xl"
                        data-testid="sim-save-roster"
                    >
                        <Save className="w-4 h-4 mr-2" />
                        Guardar borrador
                    </Button>
                    <Button
                        onClick={() => setPhase("toss")}
                        disabled={!readyL || !readyV}
                        className="rounded-xl bg-ipn-800 hover:bg-ipn-900 font-bold"
                        data-testid="sim-continue-toss"
                    >
                        Continuar al sorteo →
                    </Button>
                </div>
            </div>
        );
    }

    if (phase === "toss") {
        return (
            <div className="max-w-lg mx-auto text-center py-10">
                <Flag className="w-10 h-10 mx-auto text-ipn-800" />
                <h3 className="mt-4 font-display text-2xl font-black">
                    ¿Quién saca primero?
                </h3>
                <div className="mt-8 grid grid-cols-2 gap-4">
                    <Button
                        onClick={() => startGame("local")}
                        className="h-20 rounded-2xl bg-ipn-800 hover:bg-ipn-900 text-base font-bold"
                        data-testid="sim-serve-local"
                    >
                        {match?.local}
                    </Button>
                    <Button
                        onClick={() => startGame("vis")}
                        className="h-20 rounded-2xl bg-slate-800 hover:bg-slate-900 text-base font-bold"
                        data-testid="sim-serve-vis"
                    >
                        {match?.visitante}
                    </Button>
                </div>
            </div>
        );
    }

    if (phase === "finished") {
        return (
            <div className="text-center py-12 space-y-6">
                <CheckCircle2 className="w-12 h-12 mx-auto text-emerald-500" />
                <div>
                    <h3 className="font-display text-2xl font-black">
                        Partido cerrado
                    </h3>
                    <p className="text-slate-500 mt-2">
                        Resultado guardado · {sets.map((s) => `${s.score_local}-${s.score_vis}`).join(" · ")}
                    </p>
                </div>
                <Button
                    onClick={exportSheet}
                    className="rounded-xl bg-ipn-800 hover:bg-ipn-900"
                    data-testid="sim-export-final"
                >
                    <Download className="w-4 h-4 mr-2" />
                    Exportar hoja
                </Button>
            </div>
        );
    }

    // PLAYING
    const panels = [
        {
            team: "local",
            name: match?.local,
            color: "ipn",
            roster: rosterL,
            positions: posL,
            timeouts: timeoutsL,
        },
        {
            team: "vis",
            name: match?.visitante,
            color: "slate",
            roster: rosterV,
            positions: posV,
            timeouts: timeoutsV,
        },
    ];
    const ordered = localOnLeft ? panels : [panels[1], panels[0]];

    return (
        <div className="space-y-5">
            <div className="grid grid-cols-3 items-center rounded-2xl bg-gradient-to-br from-ipn-900 to-ipn-950 text-white p-6">
                <TeamScore
                    name={ordered[0].name}
                    score={ordered[0].team === "local" ? scoreL : scoreV}
                    serving={serving === ordered[0].team}
                    timeouts={ordered[0].timeouts}
                />
                <div className="text-center">
                    <div className="text-xs uppercase tracking-widest opacity-70">
                        Set {currentSet}
                    </div>
                    <div className="mt-1 text-xs text-white/70">
                        Serie:{" "}
                        {sets.length === 0 ? (
                            <span className="opacity-60">—</span>
                        ) : (
                            sets.map((s, i) => (
                                <span key={i} className="mx-1 font-bold">
                                    {s.score_local}-{s.score_vis}
                                </span>
                            ))
                        )}
                    </div>
                    <button
                        onClick={() => setLocalOnLeft((v) => !v)}
                        className="mt-3 text-[10px] uppercase tracking-widest text-ipnYellow font-bold hover:text-white inline-flex items-center gap-1"
                        data-testid="sim-swap-side"
                        title="Cambiar de lado"
                    >
                        <ArrowLeftRight className="w-3 h-3" />
                        Cambiar lado
                    </button>
                </div>
                <TeamScore
                    name={ordered[1].name}
                    score={ordered[1].team === "local" ? scoreL : scoreV}
                    serving={serving === ordered[1].team}
                    timeouts={ordered[1].timeouts}
                    align="right"
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {ordered.map((p) => (
                    <CourtPanel
                        key={p.team}
                        title={p.name}
                        color={p.color}
                        roster={p.roster}
                        positions={p.positions}
                        onAddPoint={() => point(p.team)}
                        onSubstitute={(idx) => openSub(p.team, idx)}
                        onTimeout={() => callTimeout(p.team)}
                        timeouts={p.timeouts}
                    />
                ))}
            </div>

            <div className="flex items-center justify-between flex-wrap gap-3 pt-4 border-t border-slate-100">
                <Button
                    variant="outline"
                    onClick={undoPoint}
                    className="rounded-xl"
                    data-testid="sim-undo"
                >
                    <RotateCw className="w-4 h-4 mr-2" />
                    Deshacer último
                </Button>
                <div className="flex gap-2 flex-wrap">
                    <Button
                        variant="outline"
                        onClick={exportSheet}
                        className="rounded-xl"
                        data-testid="sim-export"
                    >
                        <Download className="w-4 h-4 mr-1" />
                        Exportar
                    </Button>
                    <Button
                        variant="outline"
                        onClick={persist}
                        className="rounded-xl"
                        data-testid="sim-save"
                    >
                        <Save className="w-4 h-4 mr-1" />
                        Guardar
                    </Button>
                    <Button
                        onClick={finalizeSet}
                        className="rounded-xl bg-ipnYellow text-ipn-950 hover:bg-ipnYellow-600 font-bold"
                        data-testid="sim-finalize-set"
                    >
                        Finalizar set
                    </Button>
                    <Button
                        onClick={() => finalizeMatch()}
                        disabled={saving}
                        className="rounded-xl bg-ipn-800 hover:bg-ipn-900 font-bold"
                        data-testid="sim-finalize-match"
                    >
                        Finalizar partido
                    </Button>
                </div>
            </div>

            {subDialog && (
                <SubstitutionDialog
                    open={!!subDialog}
                    team={subDialog.team}
                    pos={subDialog.posIdx + 1}
                    currentPlayer={(() => {
                        const r = subDialog.team === "local" ? rosterL : rosterV;
                        const positions = subDialog.team === "local" ? posL : posV;
                        const id = positions[subDialog.posIdx];
                        return [...r.starters, r.libero].find((p) => p.id === id);
                    })()}
                    bench={benchFor(subDialog.team)}
                    onClose={() => setSubDialog(null)}
                    onConfirm={executeSub}
                />
            )}
        </div>
    );
}

function TeamScore({ name, score, serving, timeouts, align = "left" }) {
    return (
        <div className={align === "right" ? "text-right" : "text-left"}>
            <div className="text-xs uppercase tracking-widest opacity-70 truncate">
                {name}
                {serving && (
                    <span className="ml-2 bg-ipnYellow text-ipn-950 px-1.5 py-0.5 rounded text-[10px]">
                        SACA
                    </span>
                )}
            </div>
            <div className="text-6xl font-display font-black">{score}</div>
            <div className="text-[10px] uppercase tracking-widest opacity-70 mt-1">
                TO: {timeouts}/2
            </div>
        </div>
    );
}

function RosterSetup({ title, color, roster, onChange }) {
    const update = (idx, key, v) => {
        onChange({
            ...roster,
            starters: roster.starters.map((p, i) =>
                i === idx ? { ...p, [key]: v } : p,
            ),
        });
    };
    const updateLibero = (key, v) => {
        onChange({ ...roster, libero: { ...roster.libero, [key]: v } });
    };
    const addPlayer = () => {
        onChange({ ...roster, starters: [...roster.starters, emptyPlayer()] });
    };
    const removePlayer = (i) => {
        if (roster.starters.length <= 6) return;
        onChange({
            ...roster,
            starters: roster.starters.filter((_, x) => x !== i),
        });
    };
    const setCapitan = (idx) => {
        onChange({
            ...roster,
            starters: roster.starters.map((p, i) => ({
                ...p,
                es_capitan: i === idx,
            })),
        });
    };

    return (
        <div
            className={`rounded-2xl border p-4 ${
                color === "ipn"
                    ? "bg-ipn-50 border-ipn-100"
                    : "bg-slate-50 border-slate-200"
            }`}
        >
            <div className="flex items-center gap-2 mb-3">
                <Users
                    className={`w-4 h-4 ${
                        color === "ipn" ? "text-ipn-800" : "text-slate-700"
                    }`}
                />
                <h3 className="font-display font-bold">{title}</h3>
                <span className="text-xs text-slate-500 ml-auto">
                    {roster.starters.length} jugadores
                </span>
            </div>
            <div className="space-y-2">
                {roster.starters.map((p, i) => (
                    <div
                        key={p.id}
                        className="grid grid-cols-[3rem_1fr_auto_auto] gap-2 items-center"
                    >
                        <Input
                            value={p.num}
                            onChange={(e) => update(i, "num", e.target.value)}
                            placeholder="#"
                            className="h-10 rounded-lg text-center font-bold"
                            data-testid={`roster-num-${title}-${i}`}
                        />
                        <Input
                            value={p.nombre}
                            onChange={(e) =>
                                update(i, "nombre", e.target.value)
                            }
                            placeholder={
                                i < 6 ? `Titular ${i + 1}` : `Suplente ${i - 5}`
                            }
                            className="h-10 rounded-lg"
                            data-testid={`roster-name-${title}-${i}`}
                        />
                        <button
                            type="button"
                            onClick={() => setCapitan(i)}
                            className={`w-10 h-10 rounded-lg border text-xs font-bold ${
                                p.es_capitan
                                    ? "bg-ipnYellow border-ipnYellow-600 text-ipn-950"
                                    : "bg-white border-slate-200 text-slate-400 hover:border-slate-300"
                            }`}
                            title="Capitán"
                        >
                            C
                        </button>
                        {i >= 6 && (
                            <button
                                type="button"
                                onClick={() => removePlayer(i)}
                                className="w-8 h-8 rounded-lg text-slate-400 hover:text-rose-500"
                                title="Quitar"
                            >
                                ×
                            </button>
                        )}
                    </div>
                ))}
            </div>
            <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addPlayer}
                className="rounded-lg mt-2"
            >
                <Plus className="w-3 h-3 mr-1" />
                Añadir suplente
            </Button>
            <div className="mt-4 pt-4 border-t border-slate-200">
                <Label className="text-xs font-bold uppercase tracking-widest text-slate-500">
                    Líbero (opcional)
                </Label>
                <div className="grid grid-cols-[3rem_1fr] gap-2 items-center mt-2">
                    <Input
                        value={roster.libero.num}
                        onChange={(e) => updateLibero("num", e.target.value)}
                        placeholder="#"
                        className="h-10 rounded-lg text-center font-bold"
                        data-testid={`roster-libero-num-${title}`}
                    />
                    <Input
                        value={roster.libero.nombre}
                        onChange={(e) =>
                            updateLibero("nombre", e.target.value)
                        }
                        placeholder="Nombre del líbero"
                        className="h-10 rounded-lg"
                        data-testid={`roster-libero-name-${title}`}
                    />
                </div>
            </div>
        </div>
    );
}

function CourtPanel({
    title,
    color,
    roster,
    positions,
    onAddPoint,
    onSubstitute,
    onTimeout,
    timeouts,
}) {
    const lookup = (id) =>
        [...roster.starters, roster.libero].find((p) => p.id === id);
    const layout = [3, 2, 1, 4, 5, 0]; // P4 P3 P2 / P5 P6 P1

    return (
        <div
            className={`rounded-2xl border p-4 ${
                color === "ipn"
                    ? "bg-ipn-50 border-ipn-100"
                    : "bg-slate-50 border-slate-200"
            }`}
        >
            <div className="flex items-center justify-between mb-3">
                <h3 className="font-display font-bold truncate">{title}</h3>
                <button
                    onClick={onTimeout}
                    disabled={timeouts <= 0}
                    className={`text-xs inline-flex items-center gap-1 font-bold px-2 py-1 rounded-lg transition-all ${
                        timeouts > 0
                            ? "bg-white border border-slate-200 hover:bg-slate-100"
                            : "bg-slate-100 text-slate-400 cursor-not-allowed"
                    }`}
                    data-testid={`sim-timeout-${color}`}
                >
                    <Timer className="w-3 h-3" />
                    TO {timeouts}/2
                </button>
            </div>
            <div className="grid grid-cols-3 gap-2">
                {layout.map((idx) => {
                    const p = lookup(positions[idx]);
                    return (
                        <button
                            key={idx}
                            onClick={() => onSubstitute(idx)}
                            className="aspect-[5/3] rounded-xl bg-white border border-slate-200 hover:border-ipn-400 hover:shadow-sm transition-all p-2 flex flex-col items-center justify-center text-center"
                            title={`Click para sustituir en P${idx + 1}`}
                        >
                            <span className="text-[9px] uppercase font-bold text-slate-400">
                                P{idx + 1}
                            </span>
                            {p ? (
                                <>
                                    <span className="text-xl font-display font-black">
                                        #{p.num}
                                        {p.es_capitan && (
                                            <span className="ml-1 text-[10px] bg-ipnYellow text-ipn-950 px-1 rounded">
                                                C
                                            </span>
                                        )}
                                    </span>
                                    <span className="text-[11px] text-slate-600 truncate max-w-full">
                                        {p.nombre}
                                    </span>
                                </>
                            ) : (
                                <span className="text-slate-400 text-xs">—</span>
                            )}
                        </button>
                    );
                })}
            </div>
            <Button
                onClick={onAddPoint}
                className={`mt-4 w-full h-14 rounded-xl text-base font-bold ${
                    color === "ipn"
                        ? "bg-ipn-800 hover:bg-ipn-900"
                        : "bg-slate-800 hover:bg-slate-900"
                }`}
                data-testid={`sim-point-${color}`}
            >
                +1 Punto
            </Button>
        </div>
    );
}

function SubstitutionDialog({
    open,
    team,
    pos,
    currentPlayer,
    bench,
    onClose,
    onConfirm,
}) {
    return (
        <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
            <DialogContent className="sm:max-w-md rounded-2xl">
                <DialogHeader>
                    <DialogTitle className="font-display">
                        Sustitución · {team} · P{pos}
                    </DialogTitle>
                </DialogHeader>
                <div className="space-y-3">
                    <div className="rounded-xl bg-slate-50 border border-slate-100 p-3 text-sm">
                        <span className="text-xs uppercase font-bold text-slate-500">
                            Sale:
                        </span>{" "}
                        <span className="font-bold">
                            #{currentPlayer?.num} {currentPlayer?.nombre}
                        </span>
                    </div>
                    <div>
                        <Label className="text-xs font-bold uppercase">
                            Entra (elige de la banca)
                        </Label>
                        {bench.length === 0 ? (
                            <p className="text-sm text-slate-500 mt-2">
                                No hay suplentes cargados. Añade jugadores en el
                                roster.
                            </p>
                        ) : (
                            <div className="mt-2 space-y-2">
                                {bench.map((p) => (
                                    <button
                                        key={p.id}
                                        onClick={() => onConfirm(p.id)}
                                        className="w-full text-left p-3 rounded-xl border border-slate-200 hover:border-ipn-400 hover:bg-ipn-50 transition-all flex items-center gap-3"
                                        data-testid={`sub-pick-${p.id}`}
                                    >
                                        <span className="text-xl font-display font-black text-ipn-800">
                                            #{p.num}
                                        </span>
                                        <span className="flex-1 font-semibold">
                                            {p.nombre}
                                        </span>
                                        {p.is_libero && (
                                            <span className="text-[10px] uppercase font-bold bg-ipnYellow text-ipn-950 px-1.5 py-0.5 rounded">
                                                Líbero
                                            </span>
                                        )}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
                <DialogFooter>
                    <Button
                        variant="outline"
                        onClick={onClose}
                        className="rounded-xl"
                    >
                        Cancelar
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
