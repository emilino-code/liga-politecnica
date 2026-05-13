import { useState, useEffect } from "react";
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
import { Switch } from "./ui/switch";
import { api, formatApiError } from "../lib/api";
import { toast } from "sonner";
import VolleySimulator from "./VolleySimulator";
import { Sparkles } from "lucide-react";

/**
 * Score dialog used by REFEREES (PIN-based).
 * Supports two modes:
 *   - Quick: 5 sets score inputs (the original flow)
 *   - Beta: full volleyball simulator with 6+libero rotation & substitutions
 */
export default function RefereeScoreDialog({
    match,
    slug,
    pin,
    open,
    onOpenChange,
    onSaved,
}) {
    const [betaMode, setBetaMode] = useState(false);
    const [sets, setSets] = useState(
        Array.from({ length: 5 }, () => [0, 0]),
    );
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (match?.sets?.length) {
            const copy = Array.from({ length: 5 }, (_, i) =>
                match.sets[i] ? [...match.sets[i]] : [0, 0],
            );
            setSets(copy);
        } else {
            setSets(Array.from({ length: 5 }, () => [0, 0]));
        }
        setBetaMode(false);
    }, [match]);

    const setVal = (i, side, v) => {
        const next = sets.map((s) => [...s]);
        next[i][side] = parseInt(v) || 0;
        setSets(next);
    };

    const submit = async () => {
        setSaving(true);
        try {
            const filtered = sets.filter((s) => s[0] > 0 || s[1] > 0);
            await api.post(`/referee/matches/${match.id}/result`, {
                pin,
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

    if (betaMode) {
        return (
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent
                    className="max-w-6xl max-h-[95vh] overflow-y-auto rounded-2xl"
                    data-testid="beta-simulator"
                >
                    <DialogHeader>
                        <div className="flex items-center justify-between pr-8">
                            <DialogTitle className="font-display">
                                Hoja de control (BETA)
                            </DialogTitle>
                            <div className="flex items-center gap-2 text-xs">
                                <span className="text-slate-500">
                                    Modo simulador
                                </span>
                                <Switch
                                    checked={betaMode}
                                    onCheckedChange={setBetaMode}
                                    data-testid="toggle-beta"
                                />
                            </div>
                        </div>
                        <DialogDescription>
                            {match?.local} vs {match?.visitante}
                        </DialogDescription>
                    </DialogHeader>
                    <VolleySimulator
                        match={match}
                        slug={slug}
                        pin={pin}
                        onFinalized={() => {
                            onSaved?.();
                            onOpenChange(false);
                        }}
                    />
                </DialogContent>
            </Dialog>
        );
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md rounded-2xl">
                <DialogHeader>
                    <div className="flex items-center justify-between pr-8">
                        <DialogTitle className="font-display">
                            Anotar resultado
                        </DialogTitle>
                    </div>
                    <DialogDescription>
                        {match?.local} vs {match?.visitante}
                    </DialogDescription>
                </DialogHeader>

                <div className="flex items-center justify-between rounded-xl bg-ipn-50 border border-ipn-100 p-3 mb-2">
                    <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-ipn-800" />
                        <div>
                            <Label className="text-sm font-bold">
                                Modo simulador (BETA)
                            </Label>
                            <p className="text-xs text-slate-500">
                                Simula la hoja del árbitro con rotaciones
                                automáticas.
                            </p>
                        </div>
                    </div>
                    <Switch
                        checked={betaMode}
                        onCheckedChange={setBetaMode}
                        data-testid="toggle-beta"
                    />
                </div>

                <div className="space-y-3 mt-2">
                    <div className="grid grid-cols-[3rem_1fr_1rem_1fr] gap-2 items-center text-xs font-bold text-slate-500">
                        <span></span>
                        <span className="text-center truncate">
                            {match?.local}
                        </span>
                        <span></span>
                        <span className="text-center truncate">
                            {match?.visitante}
                        </span>
                    </div>
                    {sets.map((s, i) => (
                        <div
                            key={i}
                            className="grid grid-cols-[3rem_1fr_1rem_1fr] gap-2 items-center"
                        >
                            <span className="text-xs font-bold text-slate-500">
                                Set {i + 1}
                            </span>
                            <Input
                                type="number"
                                min={0}
                                value={s[0]}
                                onChange={(e) => setVal(i, 0, e.target.value)}
                                className="h-11 rounded-xl text-center font-bold"
                                data-testid={`set-local-${i}`}
                            />
                            <span className="text-center text-slate-400">—</span>
                            <Input
                                type="number"
                                min={0}
                                value={s[1]}
                                onChange={(e) => setVal(i, 1, e.target.value)}
                                className="h-11 rounded-xl text-center font-bold"
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
