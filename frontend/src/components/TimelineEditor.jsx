import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { Clock, GripVertical } from "lucide-react";

/**
 * Spotify-style timeline editor.
 * Lanes = canchas (courts) horizontal rows.
 * Slots = time blocks (computed from start/end + duration).
 * Each match is a draggable pill placed at its (cancha, hora).
 *
 * Props:
 *   matches: [{ id, hora, cancha, local, visitante, branch, status }]
 *   numCourts
 *   startTime "HH:MM"
 *   endTime   "HH:MM"
 *   duration  minutes
 *   onMove(matchId, { hora, cancha })
 */
export default function TimelineEditor({
    matches,
    numCourts,
    startTime,
    endTime,
    duration,
    onMove,
}) {
    const slots = computeSlots(startTime, endTime, duration);
    // Build grid: lane -> slot -> match
    const grid = {};
    for (let c = 1; c <= numCourts; c++) {
        grid[c] = {};
        slots.forEach((s) => (grid[c][s] = null));
    }
    matches.forEach((m) => {
        if (!m.hora) return;
        const lane = m.cancha;
        if (grid[lane] && grid[lane][m.hora] === null) {
            grid[lane][m.hora] = m;
        } else if (grid[lane]) {
            // collision: still show
            grid[lane][m.hora] = m;
        }
    });

    const onDragEnd = (result) => {
        const { source, destination, draggableId } = result;
        if (!destination) return;
        const [destCourt, destSlot] = destination.droppableId.split("|");
        if (
            source.droppableId === destination.droppableId &&
            source.index === destination.index
        )
            return;
        onMove(draggableId, { cancha: parseInt(destCourt), hora: destSlot });
    };

    return (
        <div className="vp-card p-0 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
                <div className="flex items-center gap-2 text-slate-700">
                    <Clock className="w-4 h-4" />
                    <span className="font-display font-bold">
                        Línea de tiempo
                    </span>
                </div>
                <span className="text-xs text-slate-500">
                    Arrastra los partidos entre canchas y horarios
                </span>
            </div>

            <DragDropContext onDragEnd={onDragEnd}>
                <div className="overflow-x-auto">
                    <div
                        className="grid"
                        style={{
                            gridTemplateColumns: `120px repeat(${slots.length}, minmax(140px, 1fr))`,
                        }}
                    >
                        {/* header row */}
                        <div className="bg-white sticky left-0 z-10 px-4 py-3 text-xs font-bold uppercase tracking-widest text-slate-400 border-b border-slate-100">
                            Cancha
                        </div>
                        {slots.map((s) => (
                            <div
                                key={s}
                                className="px-3 py-3 text-xs font-bold text-slate-500 border-b border-slate-100 text-center"
                            >
                                {s}
                            </div>
                        ))}

                        {/* rows */}
                        {Array.from({ length: numCourts }).map((_, idx) => {
                            const c = idx + 1;
                            return (
                                <div key={c} className="contents">
                                    <div className="bg-slate-50 sticky left-0 z-10 px-4 py-6 text-sm font-bold border-b border-slate-100 flex items-center">
                                        Cancha {c}
                                    </div>
                                    {slots.map((s) => {
                                        const droppableId = `${c}|${s}`;
                                        const match = grid[c]?.[s];
                                        return (
                                            <Droppable
                                                key={droppableId}
                                                droppableId={droppableId}
                                            >
                                                {(provided, snapshot) => (
                                                    <div
                                                        ref={provided.innerRef}
                                                        {...provided.droppableProps}
                                                        className={`court-stripe min-h-[80px] border-b border-r border-slate-100 p-2 transition-colors ${
                                                            snapshot.isDraggingOver
                                                                ? "bg-ipn-50"
                                                                : ""
                                                        }`}
                                                    >
                                                        {match && (
                                                            <Draggable
                                                                draggableId={match.id}
                                                                index={0}
                                                            >
                                                                {(p, snap) => (
                                                                    <div
                                                                        ref={
                                                                            p.innerRef
                                                                        }
                                                                        {...p.draggableProps}
                                                                        {...p.dragHandleProps}
                                                                        data-testid={`timeline-pill-${match.id}`}
                                                                        className={`pill-match ${
                                                                            match.branch ===
                                                                            "femenil"
                                                                                ? "bg-rose-50 border-rose-200 text-rose-900"
                                                                                : "bg-ipn-50 border-ipn-200 text-ipn-950"
                                                                        } ${
                                                                            snap.isDragging
                                                                                ? "rotate-2 shadow-lg"
                                                                                : ""
                                                                        } ${
                                                                            match.status ===
                                                                            "played"
                                                                                ? "opacity-60"
                                                                                : ""
                                                                        }`}
                                                                    >
                                                                        <div className="flex items-center gap-1 text-[10px] uppercase font-bold opacity-60">
                                                                            <GripVertical className="w-3 h-3" />
                                                                            {
                                                                                match.branch
                                                                            }
                                                                        </div>
                                                                        <div className="leading-tight mt-1">
                                                                            <div className="truncate">
                                                                                {
                                                                                    match.local
                                                                                }
                                                                            </div>
                                                                            <div className="text-[11px] opacity-70">
                                                                                vs
                                                                            </div>
                                                                            <div className="truncate">
                                                                                {
                                                                                    match.visitante
                                                                                }
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </Draggable>
                                                        )}
                                                        {provided.placeholder}
                                                    </div>
                                                )}
                                            </Droppable>
                                        );
                                    })}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </DragDropContext>
        </div>
    );
}

function computeSlots(start, end, duration) {
    const [sh, sm] = start.split(":").map(Number);
    const [eh, em] = end.split(":").map(Number);
    const startMin = sh * 60 + sm;
    const endMin = eh * 60 + em;
    const slots = [];
    for (let m = startMin; m + duration <= endMin + 1; m += duration) {
        const h = String(Math.floor(m / 60)).padStart(2, "0");
        const mm = String(m % 60).padStart(2, "0");
        slots.push(`${h}:${mm}`);
    }
    if (slots.length === 0) slots.push(start);
    return slots;
}
