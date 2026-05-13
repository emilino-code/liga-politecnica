import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, formatApiError } from "../lib/api";
import AppHeader from "../components/AppHeader";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { toast } from "sonner";
import CategoryEditor from "../components/CategoryEditor";
import { Volleyball, ArrowLeft, Sparkles } from "lucide-react";

export default function CreateQuick() {
    const nav = useNavigate();
    const [loading, setLoading] = useState(false);
    const [form, setForm] = useState({
        name: "",
        tipo_voley: "Sala",
        canchas: 2,
        hora_inicio: "09:00",
        duracion_bloque: 45,
        categorias: [],
    });

    const update = (k, v) => setForm({ ...form, [k]: v });

    const submit = async (e) => {
        e.preventDefault();
        if (!form.name.trim()) return toast.error("Ponle un nombre al torneo");
        if (form.categorias.length === 0)
            return toast.error("Agrega al menos una categoría");
        const invalid = form.categorias.find(
            (c) => !c.nombre.trim() || c.teams.length < 2,
        );
        if (invalid)
            return toast.error(
                "Cada categoría necesita un nombre y al menos 2 equipos",
            );

        setLoading(true);
        try {
            const payload = {
                ...form,
                canchas: parseInt(form.canchas) || 1,
                duracion_bloque: parseInt(form.duracion_bloque) || 45,
                categorias: form.categorias.map((c) => ({
                    nombre: c.nombre,
                    rama: c.rama,
                    formato: c.formato,
                    num_grupos: c.num_grupos,
                    teams: c.teams,
                })),
            };
            const { data } = await api.post("/tournaments/quick", payload);
            toast.success("Torneo creado");
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
                    <div className="w-12 h-12 rounded-2xl bg-yellow-300 grid place-items-center">
                        <Volleyball className="w-6 h-6 text-rose-500" />
                    </div>
                    <div>
                        <p className="text-xs font-bold uppercase tracking-[0.2em] text-yellow-700">
                            Modo relámpago
                        </p>
                        <h1 className="font-display text-3xl font-black">
                            Crear Torneo Rápido
                        </h1>
                    </div>
                </div>

                <form onSubmit={submit} className="mt-8 space-y-6">
                    <div className="vp-card p-6 grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div className="md:col-span-2 space-y-2">
                            <Label>Nombre del torneo</Label>
                            <Input
                                value={form.name}
                                onChange={(e) => update("name", e.target.value)}
                                placeholder="Copa Relámpago Sub-20"
                                className="h-12 rounded-xl"
                                data-testid="quick-name"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>N° de canchas</Label>
                            <Input
                                type="number"
                                min={1}
                                value={form.canchas}
                                onChange={(e) =>
                                    update("canchas", e.target.value)
                                }
                                className="h-12 rounded-xl"
                                data-testid="quick-courts"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Hora de inicio</Label>
                            <Input
                                type="time"
                                value={form.hora_inicio}
                                onChange={(e) =>
                                    update("hora_inicio", e.target.value)
                                }
                                className="h-12 rounded-xl"
                                data-testid="quick-start-time"
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
                                data-testid="quick-duration"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Tipo</Label>
                            <Input
                                value={form.tipo_voley}
                                onChange={(e) =>
                                    update("tipo_voley", e.target.value)
                                }
                                placeholder="Sala / Playa"
                                className="h-12 rounded-xl"
                                data-testid="quick-type"
                            />
                        </div>
                    </div>

                    <div className="vp-card p-6">
                        <div className="flex items-center gap-2 mb-4">
                            <Sparkles className="w-5 h-5 text-ipn-800" />
                            <h2 className="font-display text-xl font-bold">
                                Categorías
                            </h2>
                        </div>
                        <CategoryEditor
                            value={form.categorias}
                            onChange={(v) => update("categorias", v)}
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
                            data-testid="quick-submit"
                        >
                            {loading ? "Creando…" : "Generar partidos"}
                        </Button>
                    </div>
                </form>
            </main>
        </div>
    );
}
