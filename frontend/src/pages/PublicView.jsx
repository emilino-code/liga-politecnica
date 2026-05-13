import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { api } from "../lib/api";
import { Input } from "../components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "../components/ui/select";
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from "../components/ui/tabs";
import {
    Volleyball,
    Search,
    Trophy,
    Calendar,
    Handshake,
    ExternalLink,
} from "lucide-react";

export default function PublicView() {
    const { slug } = useParams();
    const [params, setParams] = useSearchParams();
    const branch = params.get("rama") || "all";
    const categoriaFilter = params.get("cat") || "all";
    const tab = params.get("tab") || "standings";
    const [data, setData] = useState(null);
    const [q, setQ] = useState("");

    useEffect(() => {
        (async () => {
            try {
                const opts = branch !== "all" ? { params: { branch } } : {};
                const { data } = await api.get(`/public/${slug}`, opts);
                setData(data);
            } catch {
                setData(false);
            }
        })();
    }, [slug, branch]);

    const setParam = (k, v) => {
        const np = new URLSearchParams(params);
        if (!v) np.delete(k);
        else np.set(k, v);
        setParams(np);
    };

    const filteredMatches = useMemo(() => {
        if (!data) return [];
        if (!q.trim()) return data.matches;
        const s = q.toLowerCase();
        return data.matches.filter((m) =>
            [
                m.local,
                m.visitante,
                m.inst_local,
                m.inst_vis,
                m.fase,
                m.grupo,
                m.hora,
                String(m.cancha),
            ]
                .filter(Boolean)
                .some((x) => String(x).toLowerCase().includes(s)),
        );
    }, [data, q]);

    if (data === false)
        return (
            <div className="min-h-screen grid place-items-center text-slate-500">
                Torneo no encontrado.
            </div>
        );
    if (!data)
        return (
            <div className="min-h-screen grid place-items-center text-slate-500">
                Cargando…
            </div>
        );

    const { tournament, standings, sponsors = [] } = data;
    const allCats = tournament.categorias.filter((c) =>
        branch === "all" ? true : c.rama === branch,
    );
    const filteredCats =
        categoriaFilter === "all"
            ? allCats
            : allCats.filter((c) => c.id === categoriaFilter);

    const groupedRol = groupMatchesByDate(filteredMatches, tournament, filteredCats);

    const hasSponsors = sponsors.length > 0;

    return (
        <div className="min-h-screen bg-slate-50">
            <header className="bg-gradient-to-br from-ipn-900 to-ipn-950 text-white">
                <div className="max-w-7xl mx-auto px-6 py-12">
                    <div className="flex items-center gap-2 text-white/70 text-xs font-bold tracking-widest uppercase">
                        <Volleyball className="w-4 h-4" />
                        {tournament.kind === "league" ? "Liga" : "Torneo Rápido"}
                    </div>
                    <h1 className="mt-3 font-display text-4xl lg:text-5xl font-black">
                        {tournament.name}
                    </h1>
                    <p className="mt-2 text-white/80">
                        {tournament.canchas} canchas ·{" "}
                        {tournament.categorias.length} categorías
                    </p>

                    <div className="mt-6 flex gap-2 flex-wrap">
                        {[
                            { v: "all", label: "Todas" },
                            { v: "femenil", label: "Femenil" },
                            { v: "varonil", label: "Varonil" },
                        ].map((b) => (
                            <button
                                key={b.v}
                                onClick={() => {
                                    setParam("rama", b.v === "all" ? null : b.v);
                                    setParam("cat", null);
                                }}
                                data-testid={`public-branch-${b.v}`}
                                className={`h-10 px-4 rounded-xl font-bold text-sm transition-all ${
                                    branch === b.v
                                        ? "bg-ipnYellow text-ipn-950"
                                        : "bg-white/10 text-white hover:bg-white/20"
                                }`}
                            >
                                {b.label}
                            </button>
                        ))}
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-6 py-8">
                {/* Sponsors banner (top, siempre visible si hay) */}
                {hasSponsors && <SponsorsStrip sponsors={sponsors} />}

                {/* Search + category filter */}
                <div className="vp-card p-3 flex items-center gap-3 mb-6">
                    <Search className="w-5 h-5 text-slate-400 ml-2" />
                    <Input
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                        placeholder="Busca equipo, institución, cancha, hora o grupo…"
                        className="border-none shadow-none focus-visible:ring-0 h-12"
                        data-testid="public-search"
                    />
                    {allCats.length > 1 && (
                        <Select
                            value={categoriaFilter}
                            onValueChange={(v) =>
                                setParam("cat", v === "all" ? null : v)
                            }
                        >
                            <SelectTrigger
                                className="h-11 rounded-xl w-56"
                                data-testid="public-cat-filter"
                            >
                                <SelectValue placeholder="Categoría" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">
                                    Todas las categorías
                                </SelectItem>
                                {allCats.map((c) => (
                                    <SelectItem key={c.id} value={c.id}>
                                        {c.rama} · {c.nombre}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    )}
                </div>

                {/* Tabs: Tablas | Rol | Patrocinios */}
                <Tabs value={tab} onValueChange={(v) => setParam("tab", v)}>
                    <TabsList className="bg-white border border-slate-100 rounded-xl p-1 h-12">
                        <TabsTrigger
                            value="standings"
                            className="rounded-lg h-10 px-4 data-[state=active]:bg-ipn-800 data-[state=active]:text-white"
                            data-testid="public-tab-standings"
                        >
                            <Trophy className="w-4 h-4 mr-2" />
                            Estadísticas
                        </TabsTrigger>
                        <TabsTrigger
                            value="rol"
                            className="rounded-lg h-10 px-4 data-[state=active]:bg-ipn-800 data-[state=active]:text-white"
                            data-testid="public-tab-rol"
                        >
                            <Calendar className="w-4 h-4 mr-2" />
                            Rol de partidos
                        </TabsTrigger>
                        {hasSponsors && (
                            <TabsTrigger
                                value="sponsors"
                                className="rounded-lg h-10 px-4 data-[state=active]:bg-ipn-800 data-[state=active]:text-white"
                                data-testid="public-tab-sponsors"
                            >
                                <Handshake className="w-4 h-4 mr-2" />
                                Patrocinios
                            </TabsTrigger>
                        )}
                    </TabsList>

                    <TabsContent value="standings" className="mt-6">
                        <StandingsGrid
                            cats={filteredCats}
                            standings={standings}
                            q={q}
                        />
                    </TabsContent>

                    <TabsContent value="rol" className="mt-6">
                        <RolList groups={groupedRol} />
                    </TabsContent>

                    {hasSponsors && (
                        <TabsContent value="sponsors" className="mt-6">
                            <SponsorsFull sponsors={sponsors} />
                        </TabsContent>
                    )}
                </Tabs>
            </main>

            <footer className="border-t border-slate-100 py-8 text-center text-sm text-slate-500">
                VolleyPro · {tournament.name}
            </footer>
        </div>
    );
}

function SponsorsStrip({ sponsors }) {
    return (
        <div className="mb-6 rounded-2xl bg-gradient-to-r from-ipnYellow/40 via-white to-ipn-100/40 border border-ipnYellow-600/20 px-4 py-3 flex items-center gap-6 overflow-x-auto">
            <span className="text-[10px] uppercase tracking-widest font-bold text-ipn-800 flex-shrink-0">
                Apoyan esta liga
            </span>
            {sponsors.map((s) => (
                <a
                    key={s.id}
                    href={s.website || "#"}
                    target={s.website ? "_blank" : undefined}
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm font-bold hover:opacity-80 flex-shrink-0"
                    data-testid={`sponsor-strip-${s.id}`}
                >
                    {s.logo_url ? (
                        <img
                            src={s.logo_url}
                            alt={s.nombre}
                            className="h-8 w-auto object-contain"
                        />
                    ) : (
                        <span className="font-display font-black text-ipn-800">
                            {s.nombre}
                        </span>
                    )}
                </a>
            ))}
        </div>
    );
}

function SponsorsFull({ sponsors }) {
    const tiers = {
        platino: { label: "Platino", color: "from-slate-200 to-slate-100", size: "h-20" },
        oro: { label: "Oro", color: "from-ipnYellow/40 to-ipnYellow/10", size: "h-16" },
        plata: { label: "Plata", color: "from-slate-100 to-white", size: "h-14" },
        bronce: { label: "Bronce", color: "from-orange-100 to-white", size: "h-12" },
    };
    const byTier = { platino: [], oro: [], plata: [], bronce: [] };
    sponsors.forEach((s) => byTier[s.tier]?.push(s));

    return (
        <div className="space-y-6">
            {["platino", "oro", "plata", "bronce"].map((t) => {
                const list = byTier[t];
                if (list.length === 0) return null;
                const cfg = tiers[t];
                return (
                    <section key={t}>
                        <h3 className="font-display text-lg font-black mb-3 text-ipn-800 uppercase tracking-widest text-sm">
                            {cfg.label}
                        </h3>
                        <div
                            className={`grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-4`}
                        >
                            {list.map((s) => (
                                <a
                                    key={s.id}
                                    href={s.website || "#"}
                                    target={s.website ? "_blank" : undefined}
                                    rel="noopener noreferrer"
                                    className={`vp-card vp-card-hover p-6 bg-gradient-to-br ${cfg.color} flex items-center justify-center`}
                                    data-testid={`sponsor-card-${s.id}`}
                                >
                                    <div className="text-center">
                                        {s.logo_url ? (
                                            <img
                                                src={s.logo_url}
                                                alt={s.nombre}
                                                className={`${cfg.size} w-auto mx-auto object-contain`}
                                            />
                                        ) : (
                                            <div className="font-display text-xl font-black text-ipn-900">
                                                {s.nombre}
                                            </div>
                                        )}
                                        <div className="mt-2 text-xs font-bold text-slate-500">
                                            {s.nombre}
                                        </div>
                                    </div>
                                </a>
                            ))}
                        </div>
                    </section>
                );
            })}
            <div className="vp-card p-6 bg-gradient-to-br from-ipn-50 to-white text-center">
                <Handshake className="w-8 h-8 mx-auto text-ipn-800" />
                <h4 className="mt-2 font-display font-black">
                    ¿Quieres patrocinar?
                </h4>
                <p className="text-sm text-slate-500 mt-1">
                    Contacta al organizador para que tu marca aparezca aquí.
                </p>
            </div>
        </div>
    );
}

function StandingsGrid({ cats, standings, q }) {
    if (cats.length === 0)
        return (
            <div className="vp-card p-8 text-center text-slate-500">
                Sin categorías disponibles con este filtro.
            </div>
        );
    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {cats.map((cat) => {
                const rows = (standings[cat.id] || []).filter((r) =>
                    !q.trim()
                        ? true
                        : [r.equipo, r.institucion]
                              .filter(Boolean)
                              .some((x) =>
                                  x.toLowerCase().includes(q.toLowerCase()),
                              ),
                );
                return (
                    <div
                        key={cat.id}
                        className="vp-card p-6"
                        data-testid={`standings-card-${cat.id}`}
                    >
                        <div className="flex items-center gap-2 mb-4">
                            <span
                                className={`text-xs font-bold uppercase px-2 py-1 rounded-full ${
                                    cat.rama === "femenil"
                                        ? "bg-ipn-100 text-ipn-900"
                                        : "bg-slate-800 text-white"
                                }`}
                            >
                                {cat.rama}
                            </span>
                            <h3 className="font-display font-bold text-lg">
                                {cat.nombre}
                            </h3>
                        </div>
                        {rows.length === 0 ? (
                            <div className="text-sm text-slate-500">
                                Aún sin resultados.
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead className="text-xs uppercase text-slate-500">
                                        <tr>
                                            <th className="text-left py-2">#</th>
                                            <th className="text-left">Equipo</th>
                                            <th>PJ</th>
                                            <th>PG</th>
                                            <th>PP</th>
                                            <th>Dif</th>
                                            <th>Ratio</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {rows.map((r, i) => (
                                            <tr
                                                key={r.equipo}
                                                className="border-t border-slate-100"
                                                data-testid={`standings-row-${cat.id}-${i}`}
                                            >
                                                <td className="py-2 font-bold text-slate-400">
                                                    {i + 1}
                                                </td>
                                                <td className="font-semibold">
                                                    {r.equipo}
                                                </td>
                                                <td className="text-center">
                                                    {r.pj}
                                                </td>
                                                <td className="text-center font-bold text-emerald-600">
                                                    {r.pg}
                                                </td>
                                                <td className="text-center text-rose-600">
                                                    {r.pp}
                                                </td>
                                                <td className="text-center">
                                                    {r.dif}
                                                </td>
                                                <td className="text-center">
                                                    {r.ratio}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}

function RolList({ groups }) {
    if (groups.length === 0)
        return (
            <div className="vp-card p-8 text-center text-slate-500">
                Sin partidos para mostrar.
            </div>
        );
    return (
        <div className="space-y-6">
            {groups.map((grp) => (
                <div key={grp.key} className="vp-card overflow-hidden">
                    <div className="bg-ipn-50 border-b border-ipn-100 px-6 py-3 flex items-center justify-between">
                        <div>
                            <p className="text-xs font-bold uppercase tracking-widest text-ipn-900">
                                {grp.label}
                            </p>
                            {grp.sublabel && (
                                <p className="text-sm text-slate-600 mt-0.5">
                                    {grp.sublabel}
                                </p>
                            )}
                        </div>
                        <span className="text-sm font-bold text-slate-500">
                            {grp.matches.length} partidos
                        </span>
                    </div>
                    <div className="divide-y divide-slate-100">
                        {grp.matches.map((m) => (
                            <PublicMatchRow key={m.id} m={m} />
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
}

function PublicMatchRow({ m }) {
    const played = m.status === "played";
    return (
        <div
            className="px-6 py-3 grid grid-cols-12 gap-3 items-center text-sm hover:bg-slate-50"
            data-testid={`public-match-${m.id}`}
        >
            <div className="col-span-3 md:col-span-2 text-xs font-bold uppercase tracking-widest text-slate-500">
                <div>{m.hora || "—"}</div>
                <div className="text-[10px]">Cancha {m.cancha}</div>
            </div>
            <div className="col-span-5 md:col-span-7 font-semibold flex items-center gap-2 min-w-0">
                <span className="truncate text-right flex-1">{m.local}</span>
                <span
                    className={`px-2 py-0.5 rounded-md text-xs font-bold min-w-[3rem] text-center ${
                        played
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-slate-100 text-slate-500"
                    }`}
                >
                    {played ? m.score : "vs"}
                </span>
                <span className="truncate flex-1">{m.visitante}</span>
            </div>
            <div className="col-span-4 md:col-span-3 text-right text-[11px] flex justify-end gap-2 items-center">
                <span
                    className={`px-2 py-0.5 rounded-full font-bold ${
                        m.branch === "femenil"
                            ? "bg-ipn-100 text-ipn-900"
                            : "bg-slate-800 text-white"
                    }`}
                >
                    {m.branch}
                </span>
                <span className="text-slate-400 hidden md:inline">{m.fase}</span>
            </div>
        </div>
    );
}

function groupMatchesByDate(matches, tournament, cats) {
    const ids = new Set(cats.map((c) => c.id));
    const filtered = matches.filter((m) => ids.has(m.category_id));

    if (tournament.kind === "league") {
        const byJ = {};
        for (const m of filtered) {
            const key = m.jornada_id || "_draft";
            byJ[key] = byJ[key] || [];
            byJ[key].push(m);
        }
        const out = [];
        for (const j of tournament.jornadas || []) {
            if (byJ[j.id]) {
                out.push({
                    key: j.id,
                    label: j.fecha,
                    sublabel: `Modo: ${j.modo} · ${j.hora_inicio}–${j.hora_fin}`,
                    matches: sortByHoraCancha(byJ[j.id]),
                });
            }
        }
        return out;
    }

    const byCat = {};
    for (const m of filtered) {
        byCat[m.category_id] = byCat[m.category_id] || [];
        byCat[m.category_id].push(m);
    }
    return cats
        .filter((c) => byCat[c.id])
        .map((c) => ({
            key: c.id,
            label: `${c.rama} · ${c.nombre}`,
            sublabel: null,
            matches: sortByHoraCancha(byCat[c.id]),
        }));
}

function sortByHoraCancha(list) {
    return list.slice().sort((a, b) => {
        const ha = a.hora || "99:99";
        const hb = b.hora || "99:99";
        if (ha !== hb) return ha.localeCompare(hb);
        return (a.cancha || 0) - (b.cancha || 0);
    });
}
