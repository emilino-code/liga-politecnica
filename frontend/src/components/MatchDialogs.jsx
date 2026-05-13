import { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { api, formatApiError } from "../lib/api";
import { toast } from "sonner";

export function ResultDialog({ match, open, onOpenChange, onSaved }) {
    const [sets, setSets] = useState(
        Array.from({ length: 5 }, () => [0, 0]),
    );
    const [saving, setSaving] = useState(false);

    const setVal = (i, side, v) => {
        const next = sets.map((s) => [...s]);
        next[i][side] = parseInt(v) || 0;
        setSets(next);
    };

    const submit = async () => {
        setSaving(true);
        try {
            const filtered = sets.filter((s) => s[0] > 0 || s[1] > 0);
            await api.post(`/matches/${match.id}/result`, {
                sets: filtered.length ? filtered : sets,
            });
            toast.success("Resultado guardado");
            onSaved?.();
            onOpenChange(false);
        } catch (err) {
            toast.error(formatApiError(err.response?.data?.detail));
        } finally {
            setSaving(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md rounded-2xl">
                <DialogHeader>
                    <DialogTitle className="font-display">
                        Subir resultado
                    </DialogTitle>
                    <DialogDescription>
                        {match?.local} vs {match?.visitante}
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-3 mt-2">
                    {sets.map((s, i) => (
                        <div key={i} className="flex items-center gap-3">
                            <span className="w-12 text-xs font-bold text-slate-500">
                                Set {i + 1}
                            </span>
                            <Input
                                type="number"
                                min={0}
                                value={s[0]}
                                onChange={(e) => setVal(i, 0, e.target.value)}
                                className="h-11 rounded-xl"
                                data-testid={`set-local-${i}`}
                            />
                            <span>—</span>
                            <Input
                                type="number"
                                min={0}
                                value={s[1]}
                                onChange={(e) => setVal(i, 1, e.target.value)}
                                className="h-11 rounded-xl"
                                data-testid={`set-vis-${i}`}
                            />
                        </div>
                    ))}
                </div>
                <DialogFooter>
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        className="rounded-xl"
                    >
                        Cancelar
                    </Button>
                    <Button
                        onClick={submit}
                        disabled={saving}
                        className="rounded-xl bg-ipn-800 hover:bg-ipn-900"
                        data-testid="submit-result"
                    >
                        {saving ? "Guardando…" : "Guardar"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

export function ReagendarDialog({
    match,
    jornadas,
    open,
    onOpenChange,
    onSaved,
}) {
    const [destino, setDestino] = useState("draft");
    const [jornadaId, setJornadaId] = useState("");
    const [pref, setPref] = useState("temprano");
    const [saving, setSaving] = useState(false);

    const submit = async () => {
        setSaving(true);
        try {
            await api.post(`/matches/${match.id}/reagendar`, {
                destino,
                jornada_id: destino === "jornada" ? jornadaId : null,
                preferencia: pref,
            });
            toast.success("Partido reagendado");
            onSaved?.();
            onOpenChange(false);
        } catch (err) {
            toast.error(formatApiError(err.response?.data?.detail));
        } finally {
            setSaving(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md rounded-2xl">
                <DialogHeader>
                    <DialogTitle className="font-display">
                        Reagendar partido
                    </DialogTitle>
                    <DialogDescription>
                        {match?.local} vs {match?.visitante} · cuenta como 1
                        permiso para ambos equipos.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 mt-2">
                    <div>
                        <Label>Destino</Label>
                        <div className="grid grid-cols-2 gap-2 mt-2">
                            <button
                                type="button"
                                onClick={() => setDestino("draft")}
                                className={`h-11 rounded-xl border-2 font-semibold ${
                                    destino === "draft"
                                        ? "bg-ipn-800 border-ipn-800 text-white"
                                        : "bg-white border-slate-200"
                                }`}
                                data-testid="reagendar-draft"
                            >
                                A bolsa de pendientes
                            </button>
                            <button
                                type="button"
                                onClick={() => setDestino("jornada")}
                                className={`h-11 rounded-xl border-2 font-semibold ${
                                    destino === "jornada"
                                        ? "bg-ipn-800 border-ipn-800 text-white"
                                        : "bg-white border-slate-200"
                                }`}
                                data-testid="reagendar-jornada"
                            >
                                A otra jornada
                            </button>
                        </div>
                    </div>

                    {destino === "jornada" && (
                        <div>
                            <Label>Jornada destino</Label>
                            <select
                                value={jornadaId}
                                onChange={(e) => setJornadaId(e.target.value)}
                                className="w-full h-11 rounded-xl border border-slate-200 px-3 mt-2"
                                data-testid="reagendar-jornada-select"
                            >
                                <option value="">Selecciona…</option>
                                {jornadas
                                    ?.filter((j) => j.id !== match?.jornada_id)
                                    .map((j) => (
                                        <option key={j.id} value={j.id}>
                                            {j.fecha} · {j.modo}
                                        </option>
                                    ))}
                            </select>
                        </div>
                    )}

                    <div>
                        <Label>Preferencia del equipo</Label>
                        <select
                            value={pref}
                            onChange={(e) => setPref(e.target.value)}
                            className="w-full h-11 rounded-xl border border-slate-200 px-3 mt-2"
                            data-testid="reagendar-pref"
                        >
                            <option value="temprano">Temprano</option>
                            <option value="tarde">Tarde</option>
                            <option value="otra">Otra jornada</option>
                        </select>
                    </div>
                </div>

                <DialogFooter>
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        className="rounded-xl"
                    >
                        Cancelar
                    </Button>
                    <Button
                        onClick={submit}
                        disabled={
                            saving ||
                            (destino === "jornada" && !jornadaId)
                        }
                        className="rounded-xl bg-ipn-800 hover:bg-ipn-900"
                        data-testid="reagendar-submit"
                    >
                        {saving ? "Guardando…" : "Confirmar"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

export function JornadaDialog({ tournament, open, onOpenChange, onSaved }) {
    const [fecha, setFecha] = useState("");
    const [modo, setModo] = useState("mixto");
    const [saving, setSaving] = useState(false);

    const submit = async () => {
        if (!fecha) return toast.error("Selecciona una fecha");
        setSaving(true);
        try {
            await api.post(`/tournaments/${tournament.id}/jornadas`, {
                fecha,
                modo,
            });
            toast.success("Jornada creada");
            onSaved?.();
            onOpenChange(false);
        } catch (err) {
            toast.error(formatApiError(err.response?.data?.detail));
        } finally {
            setSaving(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md rounded-2xl">
                <DialogHeader>
                    <DialogTitle className="font-display">
                        Programar nueva jornada
                    </DialogTitle>
                    <DialogDescription>
                        Decide qué rama jugará y la fecha.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 mt-2">
                    <div>
                        <Label>Fecha</Label>
                        <Input
                            type="date"
                            value={fecha}
                            onChange={(e) => setFecha(e.target.value)}
                            className="h-11 rounded-xl mt-2"
                            data-testid="jornada-fecha"
                        />
                    </div>

                    <div>
                        <Label>Modo</Label>
                        <div className="grid grid-cols-3 gap-2 mt-2">
                            {[
                                { v: "femenil", label: "Solo femenil" },
                                { v: "varonil", label: "Solo varonil" },
                                { v: "mixto", label: "Mixto" },
                            ].map((o) => (
                                <button
                                    key={o.v}
                                    type="button"
                                    onClick={() => setModo(o.v)}
                                    className={`h-11 rounded-xl border-2 font-semibold text-sm ${
                                        modo === o.v
                                            ? "bg-ipn-800 border-ipn-800 text-white"
                                            : "bg-white border-slate-200"
                                    }`}
                                    data-testid={`jornada-modo-${o.v}`}
                                >
                                    {o.label}
                                </button>
                            ))}
                        </div>
                        {modo === "mixto" && (
                            <p className="text-xs text-slate-500 mt-2">
                                Femenil ocupa la 1ra mitad del horario, varonil
                                la 2da. Mismas canchas.
                            </p>
                        )}
                    </div>
                </div>

                <DialogFooter>
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        className="rounded-xl"
                    >
                        Cancelar
                    </Button>
                    <Button
                        onClick={submit}
                        disabled={saving}
                        className="rounded-xl bg-ipn-800 hover:bg-ipn-900"
                        data-testid="jornada-submit"
                    >
                        {saving ? "Programando…" : "Programar"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
