import { useState, useMemo } from "react";
import { api, formatApiError } from "../lib/api";
import { Button } from "./ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "./ui/select";
import { Label } from "./ui/label";
import { toast } from "sonner";
import { Trophy, Sparkles } from "lucide-react";

const FORMATS = [
    {
        v: "top_8",
        label: "Top 8 (Cuartos)",
        desc: "Los 8 primeros entran a cuartos de final.",
        min: 8,
    },
    {
        v: "top_16",
        label: "Top 16 (Octavos)",
        desc: "Los 16 primeros entran a octavos.",
        min: 16,
    },
    {
        v: "top_32",
        label: "Top 32 (16avos)",
        desc: "Los 32 primeros entran a 16avos.",
        min: 32,
    },
    {
        v: "repechaje_2_4",
        label: "Top 2 directo + Repechaje 3-6",
        desc: "1° y 2° pasan directo a semis. 3-6 juegan repechaje por las otras dos plazas.",
        min: 6,
    },
];

export default function PlayoffSelector({ tournament, matches, onSaved }) {
    const cats = tournament.categorias || [];
    const [catId, setCatId] = useState(cats[0]?.id || "");
    const [formato, setFormato] = useState("top_8");
    const [saving, setSaving] = useState(false);

    const selectedCat = cats.find((c) => c.id === catId);
    const selectedFormat = FORMATS.find((f) => f.v === formato);

    const playedInCat = useMemo(() => {
        if (!catId) return 0;
        return matches.filter(
            (m) => m.category_id === catId && m.status === "played",
        ).length;
    }, [matches, catId]);

    const teamsCount = selectedCat?.teams?.length || 0;
    const enough = teamsCount >= (selectedFormat?.min || 0);

    const generate = async () => {
        if (!catId) return toast.error("Selecciona una categoría");
        if (!enough)
            return toast.error(
                `Necesitas al menos ${selectedFormat.min} equipos para este formato.`,
            );
        if (playedInCat === 0)
            return toast.error(
                "Aún no hay partidos jugados; las clasificaciones se calculan con la tabla.",
            );
        setSaving(true);
        try {
            const { data } = await api.post(
                `/tournaments/${tournament.id}/playoffs`,
                { category_id: catId, formato },
            );
            toast.success(
                `Bracket generado · ${data.created} partidos en bolsa de pendientes`,
            );
            onSaved?.();
        } catch (err) {
            toast.error(formatApiError(err.response?.data?.detail));
        } finally {
            setSaving(false);
        }
    };

    if (tournament.kind !== "league") {
        return (
            <div className="vp-card p-8 text-center text-slate-500">
                Los playoffs aplican solo a Ligas.
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="vp-card p-6">
                <div className="flex items-center gap-3 mb-3">
                    <Trophy className="w-6 h-6 text-ipnYellow-600" />
                    <div>
                        <h2 className="font-display text-xl font-bold">
                            Generar bracket de playoffs
                        </h2>
                        <p className="text-sm text-slate-500">
                            Decide el formato al final de la temporada regular.
                            Las eliminatorias se crean en la bolsa de
                            pendientes para que las programes en una jornada.
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5">
                    <div className="space-y-2">
                        <Label>Categoría</Label>
                        <Select value={catId} onValueChange={setCatId}>
                            <SelectTrigger
                                className="h-11 rounded-xl"
                                data-testid="playoff-cat"
                            >
                                <SelectValue placeholder="Selecciona…" />
                            </SelectTrigger>
                            <SelectContent>
                                {cats.map((c) => (
                                    <SelectItem key={c.id} value={c.id}>
                                        {c.rama} · {c.nombre} ({c.teams?.length || 0} equipos)
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label>Formato</Label>
                        <Select value={formato} onValueChange={setFormato}>
                            <SelectTrigger
                                className="h-11 rounded-xl"
                                data-testid="playoff-format"
                            >
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {FORMATS.map((f) => (
                                    <SelectItem key={f.v} value={f.v}>
                                        {f.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <div className="mt-5 rounded-xl bg-ipn-50 border border-ipn-100 p-4">
                    <div className="flex items-start gap-3">
                        <Sparkles className="w-5 h-5 text-ipn-800 flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                            <p className="font-bold text-ipn-900">
                                {selectedFormat?.label}
                            </p>
                            <p className="text-sm text-slate-600">
                                {selectedFormat?.desc}
                            </p>
                            <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                                <Stat
                                    label="Equipos"
                                    value={`${teamsCount}/${selectedFormat?.min}`}
                                    ok={enough}
                                />
                                <Stat
                                    label="Partidos jugados"
                                    value={playedInCat}
                                    ok={playedInCat > 0}
                                />
                                <Stat
                                    label="Estado"
                                    value={enough && playedInCat > 0 ? "Listo" : "Faltan datos"}
                                    ok={enough && playedInCat > 0}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="mt-5 flex justify-end">
                    <Button
                        onClick={generate}
                        disabled={saving}
                        className="h-12 rounded-xl bg-ipn-800 hover:bg-ipn-900 font-bold px-6"
                        data-testid="playoff-generate"
                    >
                        {saving ? "Generando…" : "Generar bracket"}
                    </Button>
                </div>

                <p className="text-xs text-slate-500 mt-4">
                    Si ya generaste un bracket antes para esta categoría, se
                    reemplazará con el nuevo formato (los partidos jugados se
                    pierden).
                </p>
            </div>
        </div>
    );
}

function Stat({ label, value, ok }) {
    return (
        <div className="bg-white rounded-lg border border-slate-100 p-3">
            <div className="text-[10px] uppercase font-bold tracking-widest text-slate-400">
                {label}
            </div>
            <div
                className={`mt-1 font-display text-lg font-black ${
                    ok ? "text-emerald-600" : "text-slate-400"
                }`}
            >
                {value}
            </div>
        </div>
    );
}
