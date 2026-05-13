import { useEffect, useState } from "react";
import { api, formatApiError } from "../lib/api";
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
import { toast } from "sonner";
import { Plus, Trash2, Handshake, ExternalLink } from "lucide-react";

export default function SponsorsEditor({ tournamentId }) {
    const [list, setList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [form, setForm] = useState({
        nombre: "",
        logo_url: "",
        website: "",
        tier: "plata",
    });
    const [saving, setSaving] = useState(false);

    const load = async () => {
        try {
            const { data } = await api.get(
                `/tournaments/${tournamentId}/sponsors`,
            );
            setList(data);
        } catch {
            toast.error("No se pudieron cargar los patrocinios");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tournamentId]);

    const add = async (e) => {
        e.preventDefault();
        if (!form.nombre.trim()) return toast.error("Pon al menos el nombre");
        setSaving(true);
        try {
            await api.post(
                `/tournaments/${tournamentId}/sponsors`,
                form,
            );
            setForm({ nombre: "", logo_url: "", website: "", tier: "plata" });
            toast.success("Patrocinador agregado");
            load();
        } catch (err) {
            toast.error(formatApiError(err.response?.data?.detail));
        } finally {
            setSaving(false);
        }
    };

    const remove = async (id) => {
        if (!window.confirm("¿Quitar este patrocinador?")) return;
        try {
            await api.delete(
                `/tournaments/${tournamentId}/sponsors/${id}`,
            );
            toast.success("Eliminado");
            load();
        } catch {
            toast.error("Error al eliminar");
        }
    };

    return (
        <div className="space-y-6">
            <div className="vp-card p-6">
                <div className="flex items-center gap-3 mb-2">
                    <Handshake className="w-6 h-6 text-ipn-800" />
                    <div>
                        <h2 className="font-display text-xl font-bold">
                            Patrocinios y aliados
                        </h2>
                        <p className="text-sm text-slate-500">
                            Aparecerán en la vista pública para que tu liga
                            pueda autosostenerse.
                        </p>
                    </div>
                </div>
                <form
                    onSubmit={add}
                    className="grid grid-cols-1 md:grid-cols-12 gap-3 mt-4"
                >
                    <div className="md:col-span-3 space-y-2">
                        <Label>Nombre</Label>
                        <Input
                            value={form.nombre}
                            onChange={(e) =>
                                setForm({ ...form, nombre: e.target.value })
                            }
                            placeholder="Marca o aliado"
                            className="h-11 rounded-xl"
                            data-testid="sponsor-nombre"
                        />
                    </div>
                    <div className="md:col-span-4 space-y-2">
                        <Label>Logo URL (opcional)</Label>
                        <Input
                            value={form.logo_url}
                            onChange={(e) =>
                                setForm({ ...form, logo_url: e.target.value })
                            }
                            placeholder="https://…/logo.png"
                            className="h-11 rounded-xl"
                            data-testid="sponsor-logo"
                        />
                    </div>
                    <div className="md:col-span-3 space-y-2">
                        <Label>Sitio web (opcional)</Label>
                        <Input
                            value={form.website}
                            onChange={(e) =>
                                setForm({ ...form, website: e.target.value })
                            }
                            placeholder="https://…"
                            className="h-11 rounded-xl"
                            data-testid="sponsor-web"
                        />
                    </div>
                    <div className="md:col-span-2 space-y-2">
                        <Label>Categoría</Label>
                        <Select
                            value={form.tier}
                            onValueChange={(v) => setForm({ ...form, tier: v })}
                        >
                            <SelectTrigger
                                className="h-11 rounded-xl"
                                data-testid="sponsor-tier"
                            >
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="platino">Platino</SelectItem>
                                <SelectItem value="oro">Oro</SelectItem>
                                <SelectItem value="plata">Plata</SelectItem>
                                <SelectItem value="bronce">Bronce</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="md:col-span-12 flex justify-end">
                        <Button
                            type="submit"
                            disabled={saving}
                            className="h-11 rounded-xl bg-ipn-800 hover:bg-ipn-900 font-bold"
                            data-testid="sponsor-add"
                        >
                            <Plus className="w-4 h-4 mr-1" />
                            Agregar patrocinador
                        </Button>
                    </div>
                </form>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {loading && (
                    <div className="text-slate-500 text-sm">Cargando…</div>
                )}
                {!loading && list.length === 0 && (
                    <div className="vp-card p-8 col-span-full text-center text-slate-500">
                        Sin patrocinadores aún. Añade el primero arriba.
                    </div>
                )}
                {list.map((s) => (
                    <div
                        key={s.id}
                        className="vp-card p-5 flex flex-col"
                        data-testid={`sponsor-card-${s.id}`}
                    >
                        <div className="flex items-start justify-between">
                            <span
                                className={`text-[10px] uppercase font-bold tracking-widest px-2 py-1 rounded-full ${
                                    s.tier === "platino"
                                        ? "bg-slate-200 text-slate-800"
                                        : s.tier === "oro"
                                          ? "bg-ipnYellow text-ipn-950"
                                          : s.tier === "plata"
                                            ? "bg-slate-100 text-slate-600"
                                            : "bg-orange-100 text-orange-800"
                                }`}
                            >
                                {s.tier}
                            </span>
                            <button
                                onClick={() => remove(s.id)}
                                className="text-slate-400 hover:text-rose-500"
                                title="Eliminar"
                                data-testid={`sponsor-remove-${s.id}`}
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                        {s.logo_url ? (
                            <img
                                src={s.logo_url}
                                alt={s.nombre}
                                className="mt-3 h-16 w-auto self-center object-contain"
                            />
                        ) : (
                            <div className="mt-3 font-display text-2xl font-black text-center text-ipn-800">
                                {s.nombre}
                            </div>
                        )}
                        <div className="mt-3 text-center">
                            <div className="font-bold">{s.nombre}</div>
                            {s.website && (
                                <a
                                    href={s.website}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs text-ipn-800 hover:underline inline-flex items-center gap-1"
                                >
                                    {s.website.replace(/^https?:\/\//, "")}
                                    <ExternalLink className="w-3 h-3" />
                                </a>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
