import { useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "./ui/select";
import { Textarea } from "./ui/textarea";
import { Plus, Trash2, ChevronUp, ChevronDown } from "lucide-react";

/**
 * Categories editor - dynamic add/remove
 * value: [{ nombre, rama, formato, num_grupos, teams: [{nombre, institucion}] }]
 * onChange(value)
 */
export default function CategoryEditor({ value, onChange, maxPerBranch = 5 }) {
    const update = (i, patch) => {
        const next = value.slice();
        next[i] = { ...next[i], ...patch };
        onChange(next);
    };
    const remove = (i) => {
        const next = value.slice();
        next.splice(i, 1);
        onChange(next);
    };
    const add = (rama) => {
        const sameRama = value.filter((c) => c.rama === rama).length;
        if (sameRama >= maxPerBranch) return;
        onChange([
            ...value,
            {
                nombre: "",
                rama,
                formato: "round_robin",
                num_grupos: 2,
                teams: [],
                _teamsText: "",
            },
        ]);
    };

    return (
        <div className="space-y-5">
            <div className="flex flex-wrap gap-3">
                <Button
                    type="button"
                    onClick={() => add("femenil")}
                    variant="outline"
                    className="h-11 rounded-xl border-rose-200 text-rose-700 hover:bg-rose-50"
                    data-testid="add-cat-femenil"
                >
                    <Plus className="w-4 h-4 mr-1" /> Categoría femenil
                </Button>
                <Button
                    type="button"
                    onClick={() => add("varonil")}
                    variant="outline"
                    className="h-11 rounded-xl border-ipn-200 text-ipn-900 hover:bg-ipn-50"
                    data-testid="add-cat-varonil"
                >
                    <Plus className="w-4 h-4 mr-1" /> Categoría varonil
                </Button>
            </div>

            {value.length === 0 && (
                <div className="vp-card p-8 text-center text-slate-500 text-sm">
                    Agrega al menos una categoría para empezar.
                </div>
            )}

            {value.map((cat, i) => (
                <CategoryCard
                    key={i}
                    cat={cat}
                    onChange={(patch) => update(i, patch)}
                    onRemove={() => remove(i)}
                    index={i}
                />
            ))}
        </div>
    );
}

function CategoryCard({ cat, onChange, onRemove, index }) {
    const [open, setOpen] = useState(true);
    const ramaColor =
        cat.rama === "femenil"
            ? "bg-rose-100 text-rose-700"
            : "bg-ipn-100 text-ipn-900";

    const teamsCount = cat.teams?.length || 0;

    const setTeamsFromText = (text) => {
        const teams = text
            .split("\n")
            .map((l) => l.trim())
            .filter(Boolean)
            .map((line) => {
                const [nombre, institucion = ""] = line
                    .split(",")
                    .map((s) => s.trim());
                return { nombre, institucion };
            });
        onChange({ teams, _teamsText: text });
    };

    return (
        <div className="vp-card p-6" data-testid={`category-card-${index}`}>
            <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 flex-1">
                    <span
                        className={`text-xs font-bold uppercase px-2 py-1 rounded-full ${ramaColor}`}
                    >
                        {cat.rama}
                    </span>
                    <Input
                        value={cat.nombre}
                        onChange={(e) => onChange({ nombre: e.target.value })}
                        placeholder="Nombre de la categoría (Ej: Sub-18 A)"
                        className="h-11 rounded-xl flex-1"
                        data-testid={`category-name-${index}`}
                    />
                </div>
                <button
                    onClick={() => setOpen(!open)}
                    className="text-slate-400 hover:text-slate-700"
                    type="button"
                >
                    {open ? (
                        <ChevronUp className="w-5 h-5" />
                    ) : (
                        <ChevronDown className="w-5 h-5" />
                    )}
                </button>
                <button
                    onClick={onRemove}
                    type="button"
                    className="text-slate-400 hover:text-rose-500"
                    data-testid={`category-remove-${index}`}
                >
                    <Trash2 className="w-5 h-5" />
                </button>
            </div>

            {open && (
                <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                        <Label>Formato</Label>
                        <Select
                            value={cat.formato}
                            onValueChange={(v) => onChange({ formato: v })}
                        >
                            <SelectTrigger
                                className="h-11 rounded-xl"
                                data-testid={`category-format-${index}`}
                            >
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="round_robin">
                                    Round Robin (todos contra todos)
                                </SelectItem>
                                <SelectItem value="grupos">
                                    Grupos + Eliminatoria
                                </SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {cat.formato === "grupos" && (
                        <div className="space-y-2">
                            <Label>N° de grupos</Label>
                            <Input
                                type="number"
                                min={2}
                                value={cat.num_grupos || 2}
                                onChange={(e) =>
                                    onChange({
                                        num_grupos:
                                            parseInt(e.target.value) || 2,
                                    })
                                }
                                className="h-11 rounded-xl"
                                data-testid={`category-groups-${index}`}
                            />
                        </div>
                    )}

                    <div className="space-y-2">
                        <Label>Equipos cargados</Label>
                        <div className="h-11 rounded-xl border border-slate-200 bg-slate-50 grid place-items-center font-bold">
                            {teamsCount}
                        </div>
                    </div>

                    <div className="md:col-span-3 space-y-2">
                        <Label>
                            Lista de equipos (uno por línea, formato:{" "}
                            <code>nombre, institución</code>)
                        </Label>
                        <Textarea
                            value={cat._teamsText ?? ""}
                            onChange={(e) => setTeamsFromText(e.target.value)}
                            placeholder={`Ej:\nLeones A, CCH Sur\nTigres B, ENP 5`}
                            className="min-h-[120px] rounded-xl font-mono text-sm"
                            data-testid={`category-teams-${index}`}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}
