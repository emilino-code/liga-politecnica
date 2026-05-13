import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, formatApiError } from "../lib/api";
import AppHeader from "../components/AppHeader";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Switch } from "../components/ui/switch";
import { toast } from "sonner";
import CategoryEditor from "../components/CategoryEditor";
import { Trophy, ArrowLeft, Calendar } from "lucide-react";

const DAYS = [
    { id: "lunes", label: "Lun" },
    { id: "martes", label: "Mar" },
    { id: "miercoles", label: "Mié" },
    { id: "jueves", label: "Jue" },
    { id: "viernes", label: "Vie" },
    { id: "sabado", label: "Sáb" },
    { id: "domingo", label: "Dom" },
];

export default function CreateLeague() {
    const nav = useNavigate();
    const [loading, setLoading] = useState(false);
    const [form, setForm] = useState({
        name: "",
        tipo_voley: "Sala",
        canchas: 3,
        dias_por_semana: 1,
        dias: ["domingo"],
        hora_inicio: "09:00",
        hora_fin: "18:00",
        duracion_bloque: 45,
        ida_y_vuelta: false,
        categorias: [],
    });

    const update = (k, v) => setForm({ ...form, [k]: v });

    const toggleDay = (d) => {
        const has = form.dias.includes(d);
        update("dias", has ? form.dias.filter((x) => x !== d) : [...form.dias, d]);
    };

    const submit = async (e) => {
        e.preventDefault();
        if (!form.name.trim()) return toast.error("Ponle un nombre a la liga");
        if (form.categorias.length === 0)
            return toast.error("Agrega al menos una categoría");
        if (form.dias.length === 0)
            return toast.error("Selecciona al menos un día de juego");
        const invalid = form.categorias.find(
            (c) => !c.nombre.trim() || c.teams.length < 2,
        );
        if (invalid)
            return toast.error(
                "Cada categoría necesita nombre y mínimo 2 equipos",
            );

        setLoading(true);
        try {
            const payload = {
                ...form,
                canchas: parseInt(form.canchas) || 1,
                duracion_bloque: parseInt(form.duracion_bloque) || 45,
                dias_por_semana: form.dias.length,
                categorias: form.categorias.map((c) => ({
                    nombre: c.nombre,
                    rama: c.rama,
                    formato: c.formato,
                    num_grupos: c.num_grupos,
                    teams: c.teams,
                })),
            };
            const { data } = await api.post("/tournaments/league", payload);
            toast.success("Liga creada. Ahora programa la primera jornada.");
            nav(`/t/${data.id}`);
        } catch (err) {
            toast.error(formatApiError(err.response?.data?.detail));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50">
            <AppHeader />
            <main className="max-w-4xl mx-auto px-6 py-10">
                <button
                    onClick={() => nav("/dashboard")}
                    className="text-slate-500 hover:text-slate-900 inline-flex items-center gap-1 text-sm mb-6"
                    data-testid="back-dashboard"
                >
                    <ArrowLeft className="w-4 h-4" /> Volver al panel
                </button>

                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-ipn-800 grid place-items-center">
                        <Trophy className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <p className="text-xs font-bold uppercase tracking-[0.2em] text-ipn-900">
                            Temporada larga
                        </p>
                        <h1 className="font-display text-3xl font-black">
                            Crear Liga
                        </h1>
                    </div>
                </div>

                <form onSubmit={submit} className="mt-8 space-y-6">
                    <div className="vp-card p-6 grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div className="md:col-span-2 space-y-2">
                            <Label>Nombre de la liga</Label>
                            <Input
                                value={form.name}
                                onChange={(e) => update("name", e.target.value)}
                                placeholder="Liga Dominical Inter-Escuelas 2026"
                                className="h-12 rounded-xl"
                                data-testid="league-name"
                            />
                        </div>

                        <div className="md:col-span-2 space-y-2">
                            <Label className="flex items-center gap-2">
                                <Calendar className="w-4 h-4" /> Días de juego
                            </Label>
                            <div className="flex flex-wrap gap-2">
                                {DAYS.map((d) => {
                                    const active = form.dias.includes(d.id);
                                    return (
                                        <button
                                            type="button"
                                            key={d.id}
                                            onClick={() => toggleDay(d.id)}
                                            data-testid={`day-${d.id}`}
                                            className={`h-11 px-4 rounded-xl border-2 font-semibold transition-all ${
                                                active
                                                    ? "bg-ipn-800 border-ipn-800 text-white"
                                                    : "bg-white border-slate-200 text-slate-600 hover:border-ipn-300"
                                            }`}
                                        >
                                            {d.label}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>N° de canchas (global)</Label>
                            <Input
                                type="number"
                                min={1}
                                value={form.canchas}
                                onChange={(e) =>
                                    update("canchas", e.target.value)
                                }
                                className="h-12 rounded-xl"
                                data-testid="league-courts"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Duración por partido (min)</Label>
                            <Input
                                type="number"
                                min={15}
                                step={5}
                                value={form.duracion_bloque}
                                onChange={(e) =>
                                    update("duracion_bloque", e.target.value)
                                }
                                className="h-12 rounded-xl"
                                data-testid="league-duration"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Hora inicio</Label>
                            <Input
                                type="time"
                                value={form.hora_inicio}
                                onChange={(e) =>
                                    update("hora_inicio", e.target.value)
                                }
                                className="h-12 rounded-xl"
                                data-testid="league-start"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Hora fin</Label>
                            <Input
                                type="time"
                                value={form.hora_fin}
                                onChange={(e) =>
                                    update("hora_fin", e.target.value)
                                }
                                className="h-12 rounded-xl"
                                data-testid="league-end"
                            />
                        </div>
                        <div className="md:col-span-2 flex items-center justify-between p-4 rounded-xl bg-slate-50 border border-slate-100">
                            <div>
                                <Label className="font-bold">
                                    ¿Liga con vuelta?
                                </Label>
                                <p className="text-sm text-slate-500">
                                    Genera el doble de partidos (ida + vuelta)
                                </p>
                            </div>
                            <Switch
                                checked={form.ida_y_vuelta}
                                onCheckedChange={(v) =>
                                    update("ida_y_vuelta", v)
                                }
                                data-testid="league-roundtrip"
                            />
                        </div>
                    </div>

                    <div className="vp-card p-6">
                        <h2 className="font-display text-xl font-bold mb-1">
                            Categorías y equipos
                        </h2>
                        <p className="text-sm text-slate-500 mb-4">
                            Hasta 5 categorías por rama. Los partidos se crearán
                            como <strong>borradores</strong>; tú decides qué
                            jornada toca cada fin de semana.
                        </p>
                        <CategoryEditor
                            value={form.categorias}
                            onChange={(v) => update("categorias", v)}
                            maxPerBranch={5}
                        />
                    </div>

                    <div className="flex justify-end gap-3">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => nav("/dashboard")}
                            className="h-12 rounded-xl"
                        >
                            Cancelar
                        </Button>
                        <Button
                            type="submit"
                            disabled={loading}
                            className="h-12 rounded-xl bg-ipn-800 hover:bg-ipn-900 px-6 font-bold"
                            data-testid="league-submit"
                        >
                            {loading ? "Creando…" : "Crear liga"}
                        </Button>
                    </div>
                </form>
            </main>
        </div>
    );
}
