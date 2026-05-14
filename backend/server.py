from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

import os
import uuid
import logging
import random
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Literal

import bcrypt
import jwt
from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, EmailStr

# ----------------- DB -----------------
mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

# ----------------- App -----------------
app = FastAPI(title="VolleyPro API")
api = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("volleypro")

# ----------------- Auth helpers -----------------
JWT_ALG = "HS256"
JWT_SECRET = os.environ["JWT_SECRET"]


def hash_password(p: str) -> str:
    return bcrypt.hashpw(p.encode(), bcrypt.gensalt()).decode()


def verify_password(p: str, h: str) -> bool:
    try:
        return bcrypt.checkpw(p.encode(), h.encode())
    except Exception:
        return False


def create_access_token(uid: str, email: str) -> str:
    payload = {
        "sub": uid,
        "email": email,
        "exp": datetime.now(timezone.utc) + timedelta(days=7),
        "type": "access",
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALG)


def set_auth_cookie(response: Response, token: str):
    response.set_cookie(
        key="access_token",
        value=token,
        httponly=True,
        secure=False,
        samesite="lax",
        max_age=60 * 60 * 24 * 7,
        path="/",
    )


async def get_current_user(request: Request) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        auth = request.headers.get("Authorization", "")
        if auth.startswith("Bearer "):
            token = auth[7:]
    if not token:
        raise HTTPException(status_code=401, detail="No autenticado")
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALG])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Sesión expirada")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Token inválido")
    user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0, "password_hash": 0})
    if not user:
        raise HTTPException(status_code=401, detail="Usuario no encontrado")
    return user


# ----------------- Models -----------------
class RegisterIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    name: str = Field(min_length=1)


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class TeamIn(BaseModel):
    nombre: str
    institucion: str = ""


class CategoryIn(BaseModel):
    nombre: str
    rama: Literal["femenil", "varonil"]
    teams: List[TeamIn] = []
    num_grupos: Optional[int] = None
    formato: Literal["round_robin", "grupos"] = "round_robin"


class QuickTournamentIn(BaseModel):
    name: str
    tipo_voley: str = "Sala"
    canchas: int = 2
    hora_inicio: str = "09:00"
    duracion_bloque: int = 45
    categorias: List[CategoryIn]


class LeagueTournamentIn(BaseModel):
    name: str
    tipo_voley: str = "Sala"
    canchas: int = 2
    dias_por_semana: int = 1
    dias: List[str] = []  # ['domingo']
    hora_inicio: str = "09:00"
    hora_fin: str = "18:00"
    duracion_bloque: int = 45
    ida_y_vuelta: bool = False
    formato_playoff: Optional[str] = None  # null until decided
    categorias: List[CategoryIn]


class JornadaCreateIn(BaseModel):
    fecha: str  # YYYY-MM-DD
    modo: Literal["varonil", "femenil", "mixto"]
    hora_inicio: Optional[str] = None
    hora_fin: Optional[str] = None
    canchas: Optional[int] = None


class MatchPatch(BaseModel):
    hora: Optional[str] = None
    cancha: Optional[int] = None
    jornada_id: Optional[str] = None


class ResultIn(BaseModel):
    sets: List[List[int]]  # [[s1l, s1v], [s2l, s2v], ...]


class ReagendarIn(BaseModel):
    destino: Literal["draft", "jornada"]
    jornada_id: Optional[str] = None
    preferencia: Optional[str] = None  # "temprano" | "tarde" | "otra"


class RecalcularIn(BaseModel):
    nuevas_canchas: int


class RefereeAuthIn(BaseModel):
    slug: str
    pin: str


class RefereeResultIn(BaseModel):
    pin: str
    sets: List[List[int]]


class MatchSheetIn(BaseModel):
    pin: str
    players_local: List[dict] = []
    players_vis: List[dict] = []
    positions_local: List[Optional[str]] = []  # list of player ids in pos 1-6
    positions_vis: List[Optional[str]] = []
    serving: Optional[str] = None  # "local" | "vis"
    current_set: int = 1
    sets: List[dict] = []
    score_local: int = 0
    score_vis: int = 0
    substitutions: List[dict] = []
    enabled: bool = True


class RefereePinUpdate(BaseModel):
    pin: str = Field(min_length=4, max_length=8)


class SponsorIn(BaseModel):
    nombre: str
    logo_url: Optional[str] = None
    website: Optional[str] = None
    tier: Literal["platino", "oro", "plata", "bronce"] = "plata"


class PlayoffIn(BaseModel):
    category_id: str
    formato: Literal["top_8", "top_16", "top_32", "repechaje_2_4"]


# ----------------- Scheduling logic (ported) -----------------
def _agendar(matches, hora_inicio_str, num_canchas, duracion):
    if not matches:
        return []
    hora_actual = datetime.strptime(hora_inicio_str, "%H:%M")
    canchas = [{"id": i + 1, "libre": hora_actual} for i in range(num_canchas)]
    bloque = timedelta(minutes=duracion)
    pendientes = matches.copy()
    agendados = []
    equipo_libre = {}
    while pendientes:
        canchas.sort(key=lambda c: c["libre"])
        c = canchas[0]
        base = c["libre"]
        asignado = False
        for p in pendientes:
            ll = equipo_libre.get(p["local"], hora_actual)
            lv = equipo_libre.get(p["visitante"], hora_actual)
            arranque = max(base, ll, lv)
            if arranque == base:
                p["hora"] = base.strftime("%H:%M")
                p["cancha"] = c["id"]
                agendados.append(p)
                pendientes.remove(p)
                nuevo = base + bloque
                c["libre"] = nuevo
                equipo_libre[p["local"]] = nuevo
                equipo_libre[p["visitante"]] = nuevo
                asignado = True
                break
        if not asignado:
            c["libre"] += bloque
    agendados.sort(key=lambda x: (datetime.strptime(x["hora"], "%H:%M"), x["cancha"]))
    return agendados


def _round_robin(equipos, ida_y_vuelta=False):
    eq = equipos.copy()
    if len(eq) % 2 != 0:
        eq.append({"nombre": "DESCANSO", "institucion": ""})
    n = len(eq)
    partidos = []
    for _ in range(n - 1):
        for i in range(n // 2):
            local, vis = eq[i], eq[n - 1 - i]
            if local["nombre"] != "DESCANSO" and vis["nombre"] != "DESCANSO":
                partidos.append(
                    {
                        "local": local["nombre"],
                        "visitante": vis["nombre"],
                        "inst_local": local["institucion"],
                        "inst_vis": vis["institucion"],
                        "fase": "Regular",
                        "grupo": "Único",
                    }
                )
        eq.insert(1, eq.pop())
    if ida_y_vuelta:
        vuelta = []
        for p in partidos:
            vuelta.append(
                {
                    "local": p["visitante"],
                    "visitante": p["local"],
                    "inst_local": p["inst_vis"],
                    "inst_vis": p["inst_local"],
                    "fase": "Regular",
                    "grupo": "Único",
                }
            )
        partidos.extend(vuelta)
    return partidos


def _distribuir_grupos(equipos, num_grupos):
    grupos = [[] for _ in range(num_grupos)]
    for e in equipos:
        e["club"] = e["nombre"].split()[0].upper() if e["nombre"] else ""
    equipos.sort(key=lambda x: x.get("club", ""))
    for e in equipos:
        idx = min(
            range(num_grupos),
            key=lambda i: (
                sum(1 for x in grupos[i] if x.get("club") == e["club"]),
                len(grupos[i]),
            ),
        )
        grupos[idx].append(e)
    return grupos


def _grupos_partidos(equipos, num_grupos):
    grupos = _distribuir_grupos(equipos, num_grupos)
    nombres = "ABCDEFGHIJKLMNOP"
    partidos = []
    grupos_part = []
    for i, g in enumerate(grupos):
        nombre_g = nombres[i] if i < len(nombres) else str(i + 1)
        ps = _round_robin(g)
        for p in ps:
            p["fase"] = "Grupos"
            p["grupo"] = nombre_g
        grupos_part.append(ps)
    max_len = max((len(g) for g in grupos_part), default=0)
    for i in range(max_len):
        for gp in grupos_part:
            if i < len(gp):
                partidos.append(gp[i])
    return partidos


def _new_match(p, tournament_id, category_id, branch, jornada_id=None, status="scheduled"):
    return {
        "id": str(uuid.uuid4()),
        "tournament_id": tournament_id,
        "category_id": category_id,
        "branch": branch,
        "jornada_id": jornada_id,
        "status": status,
        "local": p.get("local", ""),
        "visitante": p.get("visitante", ""),
        "inst_local": p.get("inst_local", ""),
        "inst_vis": p.get("inst_vis", ""),
        "fase": p.get("fase", "Regular"),
        "grupo": p.get("grupo", "Único"),
        "hora": p.get("hora", ""),
        "cancha": p.get("cancha", 1),
        "score": "Pendiente",
        "sets": [],
        "set_ganados_local": 0,
        "set_ganados_vis": 0,
        "pts_favor_local": 0,
        "pts_favor_vis": 0,
        "reagendado_pref": None,
    }


# ----------------- Auth Endpoints -----------------
@api.post("/auth/register")
async def register(body: RegisterIn, response: Response):
    email = body.email.lower()
    if await db.users.find_one({"email": email}):
        raise HTTPException(status_code=400, detail="El correo ya está registrado")
    uid = str(uuid.uuid4())
    user = {
        "id": uid,
        "email": email,
        "name": body.name,
        "password_hash": hash_password(body.password),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.users.insert_one(user)
    token = create_access_token(uid, email)
    set_auth_cookie(response, token)
    return {"id": uid, "email": email, "name": body.name, "token": token}


@api.post("/auth/login")
async def login(body: LoginIn, response: Response):
    email = body.email.lower()
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(body.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Correo o contraseña incorrectos")
    token = create_access_token(user["id"], email)
    set_auth_cookie(response, token)
    return {"id": user["id"], "email": email, "name": user["name"], "token": token}


@api.post("/auth/logout")
async def logout(response: Response):
    response.delete_cookie("access_token", path="/")
    return {"ok": True}


@api.get("/auth/me")
async def me(user=Depends(get_current_user)):
    return {"id": user["id"], "email": user["email"], "name": user["name"]}


# ----------------- Helper: serialize tournament -----------------
async def _get_tournament_or_404(tid: str, user_id: str):
    t = await db.tournaments.find_one({"id": tid, "user_id": user_id}, {"_id": 0})
    if not t:
        raise HTTPException(status_code=404, detail="Torneo no encontrado")
    return t


def _slugify(s: str) -> str:
    return "".join(c.lower() if c.isalnum() else "-" for c in s).strip("-")


# ----------------- Tournament Endpoints -----------------
@api.get("/tournaments")
async def list_tournaments(user=Depends(get_current_user)):
    docs = await db.tournaments.find({"user_id": user["id"]}, {"_id": 0}).sort(
        "created_at", -1
    ).to_list(500)
    return docs


@api.post("/tournaments/quick")
async def create_quick(body: QuickTournamentIn, user=Depends(get_current_user)):
    tid = str(uuid.uuid4())
    slug = f"{_slugify(body.name)}-{tid[:6]}"
    referee_pin = str(random.randint(1000, 9999))
    categorias_out = []
    matches_to_insert = []
    for cat in body.categorias:
        cid = str(uuid.uuid4())
        equipos = [t.model_dump() for t in cat.teams]
        if cat.formato == "round_robin":
            partidos = _round_robin(equipos)
        else:
            ng = cat.num_grupos or max(2, len(equipos) // 4)
            partidos = _grupos_partidos(equipos, ng)
        partidos = _agendar(partidos, body.hora_inicio, body.canchas, body.duracion_bloque)
        for p in partidos:
            matches_to_insert.append(_new_match(p, tid, cid, cat.rama))
        categorias_out.append(
            {
                "id": cid,
                "nombre": cat.nombre,
                "rama": cat.rama,
                "formato": cat.formato,
                "num_grupos": cat.num_grupos,
                "teams": equipos,
            }
        )
    doc = {
        "id": tid,
        "user_id": user["id"],
        "kind": "quick",
        "name": body.name,
        "slug": slug,
        "referee_pin": referee_pin,
        "tipo_voley": body.tipo_voley,
        "canchas": body.canchas,
        "hora_inicio": body.hora_inicio,
        "duracion_bloque": body.duracion_bloque,
        "categorias": categorias_out,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.tournaments.insert_one(doc)
    if matches_to_insert:
        await db.matches.insert_many(matches_to_insert)
    doc.pop("_id", None)
    return doc


@api.post("/tournaments/league")
async def create_league(body: LeagueTournamentIn, user=Depends(get_current_user)):
    tid = str(uuid.uuid4())
    slug = f"{_slugify(body.name)}-{tid[:6]}"
    referee_pin = str(random.randint(1000, 9999))
    categorias_out = []
    drafts = []
    for cat in body.categorias:
        cid = str(uuid.uuid4())
        equipos = [t.model_dump() for t in cat.teams]
        # Initialize reagendados counter per team
        for e in equipos:
            e["reagendados"] = 0
        if cat.formato == "round_robin":
            partidos = _round_robin(equipos, ida_y_vuelta=body.ida_y_vuelta)
        else:
            ng = cat.num_grupos or max(2, len(equipos) // 4)
            partidos = _grupos_partidos(equipos, ng)
        # All matches start as drafts (no jornada assigned yet)
        for p in partidos:
            drafts.append(_new_match(p, tid, cid, cat.rama, jornada_id=None, status="draft"))
        categorias_out.append(
            {
                "id": cid,
                "nombre": cat.nombre,
                "rama": cat.rama,
                "formato": cat.formato,
                "num_grupos": cat.num_grupos,
                "teams": equipos,
            }
        )
    doc = {
        "id": tid,
        "user_id": user["id"],
        "kind": "league",
        "name": body.name,
        "slug": slug,
        "referee_pin": referee_pin,
        "tipo_voley": body.tipo_voley,
        "canchas": body.canchas,
        "dias_por_semana": body.dias_por_semana,
        "dias": body.dias,
        "hora_inicio": body.hora_inicio,
        "hora_fin": body.hora_fin,
        "duracion_bloque": body.duracion_bloque,
        "ida_y_vuelta": body.ida_y_vuelta,
        "formato_playoff": body.formato_playoff,
        "categorias": categorias_out,
        "jornadas": [],
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.tournaments.insert_one(doc)
    if drafts:
        await db.matches.insert_many(drafts)
    doc.pop("_id", None)
    return doc


@api.get("/tournaments/{tid}")
async def get_tournament(tid: str, user=Depends(get_current_user)):
    t = await _get_tournament_or_404(tid, user["id"])
    matches = await db.matches.find({"tournament_id": tid}, {"_id": 0}).to_list(5000)
    return {"tournament": t, "matches": matches}


@api.delete("/tournaments/{tid}")
async def delete_tournament(tid: str, user=Depends(get_current_user)):
    t = await _get_tournament_or_404(tid, user["id"])
    await db.tournaments.delete_one({"id": tid})
    await db.matches.delete_many({"tournament_id": tid})
    return {"ok": True}


@api.post("/tournaments/{tid}/recalcular")
async def recalcular(tid: str, body: RecalcularIn, user=Depends(get_current_user)):
    """Reagenda solo partidos no jugados con nuevo número de canchas."""
    t = await _get_tournament_or_404(tid, user["id"])
    pendientes = await db.matches.find(
        {"tournament_id": tid, "status": {"$ne": "played"}}, {"_id": 0}
    ).to_list(5000)
    if not pendientes:
        return {"ok": True, "message": "No hay partidos pendientes"}
    duracion = t.get("duracion_bloque", 45)
    hora = t.get("hora_inicio", "09:00")
    # Group by jornada (league) or no jornada (quick)
    if t["kind"] == "quick":
        re = _agendar(pendientes, hora, body.nuevas_canchas, duracion)
        for p in re:
            await db.matches.update_one(
                {"id": p["id"]},
                {"$set": {"hora": p["hora"], "cancha": p["cancha"], "status": "scheduled"}},
            )
    else:
        # group by jornada_id
        by_j = {}
        for p in pendientes:
            jid = p.get("jornada_id") or "_draft"
            by_j.setdefault(jid, []).append(p)
        for jid, items in by_j.items():
            if jid == "_draft":
                continue
            jornada = next((j for j in t.get("jornadas", []) if j["id"] == jid), None)
            ji = jornada["hora_inicio"] if jornada else hora
            re = _agendar(items, ji, body.nuevas_canchas, duracion)
            for p in re:
                await db.matches.update_one(
                    {"id": p["id"]},
                    {"$set": {"hora": p["hora"], "cancha": p["cancha"]}},
                )
    await db.tournaments.update_one({"id": tid}, {"$set": {"canchas": body.nuevas_canchas}})
    return {"ok": True}


# ----------------- Jornadas (Liga) -----------------
@api.post("/tournaments/{tid}/jornadas")
async def crear_jornada(tid: str, body: JornadaCreateIn, user=Depends(get_current_user)):
    t = await _get_tournament_or_404(tid, user["id"])
    if t["kind"] != "league":
        raise HTTPException(status_code=400, detail="Solo aplica a Ligas")

    canchas = body.canchas or t["canchas"]
    duracion = t.get("duracion_bloque", 45)
    h_ini = body.hora_inicio or t["hora_inicio"]
    h_fin = body.hora_fin or t["hora_fin"]

    # Compute slot count available between h_ini and h_fin
    fmt = "%H:%M"
    t_ini = datetime.strptime(h_ini, fmt)
    t_fin = datetime.strptime(h_fin, fmt)
    total_minutes = int((t_fin - t_ini).total_seconds() // 60)
    slots_per_court = max(1, total_minutes // duracion)
    capacity = slots_per_court * canchas

    jid = str(uuid.uuid4())

    # Pull drafts ordered: prioritize fewer matches per category cycling
    drafts = await db.matches.find(
        {"tournament_id": tid, "status": "draft"}, {"_id": 0}
    ).to_list(5000)

    # Filter by mode
    drafts_fem = [d for d in drafts if d["branch"] == "femenil"]
    drafts_var = [d for d in drafts if d["branch"] == "varonil"]

    if body.modo == "femenil":
        seleccion = drafts_fem[:capacity]
        agendados = _agendar(seleccion, h_ini, canchas, duracion)
    elif body.modo == "varonil":
        seleccion = drafts_var[:capacity]
        agendados = _agendar(seleccion, h_ini, canchas, duracion)
    else:
        # Mixto: 1ra mitad solo femenil, 2da mitad varonil, mismas canchas
        half_minutes = total_minutes // 2
        # Round half_minutes down to multiple of duracion
        half_slots = max(1, half_minutes // duracion)
        cap_fem = half_slots * canchas
        cap_var = (slots_per_court - half_slots) * canchas
        sel_fem = drafts_fem[:cap_fem]
        sel_var = drafts_var[:cap_var]
        ag_fem = _agendar(sel_fem, h_ini, canchas, duracion)
        # Varonil starts after femenil block
        var_start_dt = t_ini + timedelta(minutes=half_slots * duracion)
        ag_var = _agendar(sel_var, var_start_dt.strftime(fmt), canchas, duracion)
        agendados = ag_fem + ag_var

    if not agendados:
        raise HTTPException(
            status_code=400,
            detail="No hay partidos en borrador para esta rama o configuración.",
        )

    # Update matches
    for p in agendados:
        await db.matches.update_one(
            {"id": p["id"]},
            {
                "$set": {
                    "jornada_id": jid,
                    "status": "scheduled",
                    "hora": p["hora"],
                    "cancha": p["cancha"],
                }
            },
        )

    jornada = {
        "id": jid,
        "fecha": body.fecha,
        "modo": body.modo,
        "hora_inicio": h_ini,
        "hora_fin": h_fin,
        "canchas": canchas,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.tournaments.update_one({"id": tid}, {"$push": {"jornadas": jornada}})
    return {"jornada": jornada, "agendados": len(agendados)}


@api.delete("/tournaments/{tid}/jornadas/{jid}")
async def borrar_jornada(tid: str, jid: str, user=Depends(get_current_user)):
    t = await _get_tournament_or_404(tid, user["id"])
    # send matches back to draft (only those not played)
    await db.matches.update_many(
        {"tournament_id": tid, "jornada_id": jid, "status": {"$ne": "played"}},
        {"$set": {"jornada_id": None, "status": "draft", "hora": "", "cancha": 1}},
    )
    await db.tournaments.update_one({"id": tid}, {"$pull": {"jornadas": {"id": jid}}})
    return {"ok": True}


# ----------------- Match Endpoints -----------------
@api.patch("/matches/{mid}")
async def patch_match(mid: str, body: MatchPatch, user=Depends(get_current_user)):
    m = await db.matches.find_one({"id": mid}, {"_id": 0})
    if not m:
        raise HTTPException(status_code=404, detail="Partido no encontrado")
    await _get_tournament_or_404(m["tournament_id"], user["id"])
    update = {k: v for k, v in body.model_dump(exclude_none=True).items()}
    if update:
        await db.matches.update_one({"id": mid}, {"$set": update})
    return {"ok": True}


@api.post("/matches/{mid}/result")
async def submit_result(mid: str, body: ResultIn, user=Depends(get_current_user)):
    m = await db.matches.find_one({"id": mid}, {"_id": 0})
    if not m:
        raise HTTPException(status_code=404, detail="Partido no encontrado")
    await _get_tournament_or_404(m["tournament_id"], user["id"])
    sl = sv = pf_l = pf_v = 0
    for s in body.sets:
        if len(s) != 2:
            continue
        a, b = int(s[0]), int(s[1])
        pf_l += a
        pf_v += b
        if a > b:
            sl += 1
        elif b > a:
            sv += 1
    score = f"{sl}-{sv}"
    await db.matches.update_one(
        {"id": mid},
        {
            "$set": {
                "sets": body.sets,
                "set_ganados_local": sl,
                "set_ganados_vis": sv,
                "pts_favor_local": pf_l,
                "pts_favor_vis": pf_v,
                "score": score,
                "status": "played",
            }
        },
    )
    return {"ok": True, "score": score}


@api.post("/matches/{mid}/reagendar")
async def reagendar(mid: str, body: ReagendarIn, user=Depends(get_current_user)):
    m = await db.matches.find_one({"id": mid}, {"_id": 0})
    if not m:
        raise HTTPException(status_code=404, detail="Partido no encontrado")
    t = await _get_tournament_or_404(m["tournament_id"], user["id"])
    if t["kind"] != "league":
        raise HTTPException(status_code=400, detail="Reagendado solo aplica a Ligas")

    # Update reagendado count for both teams (max 2)
    cat = next((c for c in t["categorias"] if c["id"] == m["category_id"]), None)
    if not cat:
        raise HTTPException(status_code=400, detail="Categoría inválida")
    teams = cat["teams"]
    target_names = {m["local"], m["visitante"]}
    for team in teams:
        if team["nombre"] in target_names:
            current = team.get("reagendados", 0)
            if current >= 2:
                raise HTTPException(
                    status_code=400,
                    detail=f"El equipo '{team['nombre']}' ya usó sus 2 permisos de reagendado.",
                )
    for team in teams:
        if team["nombre"] in target_names:
            team["reagendados"] = team.get("reagendados", 0) + 1
    await db.tournaments.update_one(
        {"id": t["id"], "categorias.id": cat["id"]},
        {"$set": {"categorias.$.teams": teams}},
    )

    if body.destino == "draft":
        await db.matches.update_one(
            {"id": mid},
            {
                "$set": {
                    "jornada_id": None,
                    "status": "draft",
                    "hora": "",
                    "cancha": 1,
                    "reagendado_pref": body.preferencia,
                }
            },
        )
    else:
        if not body.jornada_id:
            raise HTTPException(status_code=400, detail="Falta jornada_id")
        # Move to specific jornada (still scheduled but in new jornada)
        await db.matches.update_one(
            {"id": mid},
            {
                "$set": {
                    "jornada_id": body.jornada_id,
                    "reagendado_pref": body.preferencia,
                }
            },
        )
    return {"ok": True}


# ----------------- Public View -----------------
@api.get("/public/{slug}")
async def public_view(slug: str, branch: Optional[str] = None):
    t = await db.tournaments.find_one({"slug": slug}, {"_id": 0, "user_id": 0})
    if not t:
        raise HTTPException(status_code=404, detail="Torneo no encontrado")
    t.pop("referee_pin", None)
    q = {"tournament_id": t["id"]}
    if branch in ("femenil", "varonil"):
        q["branch"] = branch
    matches = await db.matches.find(q, {"_id": 0}).to_list(5000)

    # sponsors (public)
    sponsors = await db.sponsors.find(
        {"tournament_id": t["id"]}, {"_id": 0}
    ).to_list(200)

    # Compute standings per category
    standings = {}
    for cat in t["categorias"]:
        if branch and cat["rama"] != branch:
            continue
        cat_matches = [m for m in matches if m["category_id"] == cat["id"]]
        tabla = {}
        for m in cat_matches:
            for name, inst in [(m["local"], m["inst_local"]), (m["visitante"], m["inst_vis"])]:
                if name and name not in tabla:
                    tabla[name] = {
                        "institucion": inst,
                        "pj": 0,
                        "pg": 0,
                        "pp": 0,
                        "pf": 0,
                        "pc": 0,
                    }
        for m in cat_matches:
            if m["status"] != "played":
                continue
            l, v = m["local"], m["visitante"]
            if l not in tabla or v not in tabla:
                continue
            tabla[l]["pj"] += 1
            tabla[v]["pj"] += 1
            tabla[l]["pf"] += m.get("pts_favor_local", 0)
            tabla[l]["pc"] += m.get("pts_favor_vis", 0)
            tabla[v]["pf"] += m.get("pts_favor_vis", 0)
            tabla[v]["pc"] += m.get("pts_favor_local", 0)
            if m["set_ganados_local"] > m["set_ganados_vis"]:
                tabla[l]["pg"] += 1
                tabla[v]["pp"] += 1
            else:
                tabla[v]["pg"] += 1
                tabla[l]["pp"] += 1
        rows = []
        for name, st in tabla.items():
            dif = st["pf"] - st["pc"]
            ratio = round(st["pf"] / st["pc"], 3) if st["pc"] > 0 else float(st["pf"])
            rows.append({"equipo": name, **st, "dif": dif, "ratio": ratio})
        rows.sort(key=lambda x: (x["pg"], x["ratio"], x["dif"]), reverse=True)
        standings[cat["id"]] = rows

    # Strip user-scoped data
    safe_t = {
        k: v
        for k, v in t.items()
        if k not in ("user_id",)
    }
    return {
        "tournament": safe_t,
        "matches": matches,
        "standings": standings,
        "sponsors": sponsors,
    }




# ----------------- Referee (PIN-based access) -----------------
async def _authed_tournament_by_pin(slug: str, pin: str) -> dict:
    t = await db.tournaments.find_one({"slug": slug}, {"_id": 0})
    if not t:
        raise HTTPException(status_code=404, detail="Torneo no encontrado")
    if str(t.get("referee_pin", "")) != str(pin):
        raise HTTPException(status_code=401, detail="PIN incorrecto")
    return t


@api.post("/referee/auth")
async def referee_auth(body: RefereeAuthIn):
    t = await _authed_tournament_by_pin(body.slug, body.pin)
    safe = {k: v for k, v in t.items() if k not in ("user_id", "referee_pin")}
    return {"tournament": safe, "ok": True}


@api.get("/referee/{slug}/matches")
async def referee_matches(slug: str, pin: str):
    t = await _authed_tournament_by_pin(slug, pin)
    matches = await db.matches.find(
        {"tournament_id": t["id"]}, {"_id": 0}
    ).to_list(5000)
    safe = {k: v for k, v in t.items() if k not in ("user_id", "referee_pin")}
    return {"tournament": safe, "matches": matches}


@api.post("/referee/matches/{mid}/result")
async def referee_submit_result(mid: str, body: RefereeResultIn):
    m = await db.matches.find_one({"id": mid}, {"_id": 0})
    if not m:
        raise HTTPException(status_code=404, detail="Partido no encontrado")
    t = await db.tournaments.find_one({"id": m["tournament_id"]}, {"_id": 0})
    if not t or str(t.get("referee_pin", "")) != str(body.pin):
        raise HTTPException(status_code=401, detail="PIN incorrecto")
    sl = sv = pf_l = pf_v = 0
    for s in body.sets:
        if len(s) != 2:
            continue
        a, b = int(s[0]), int(s[1])
        pf_l += a
        pf_v += b
        if a > b:
            sl += 1
        elif b > a:
            sv += 1
    score = f"{sl}-{sv}"
    await db.matches.update_one(
        {"id": mid},
        {
            "$set": {
                "sets": body.sets,
                "set_ganados_local": sl,
                "set_ganados_vis": sv,
                "pts_favor_local": pf_l,
                "pts_favor_vis": pf_v,
                "score": score,
                "status": "played",
            }
        },
    )
    return {"ok": True, "score": score}


@api.get("/referee/matches/{mid}/sheet")
async def referee_get_sheet(mid: str, pin: str, slug: str):
    await _authed_tournament_by_pin(slug, pin)
    sheet = await db.match_sheets.find_one({"match_id": mid}, {"_id": 0})
    return sheet or {}


@api.put("/referee/matches/{mid}/sheet")
async def referee_put_sheet(mid: str, body: MatchSheetIn):
    m = await db.matches.find_one({"id": mid}, {"_id": 0})
    if not m:
        raise HTTPException(status_code=404, detail="Partido no encontrado")
    t = await db.tournaments.find_one({"id": m["tournament_id"]}, {"_id": 0})
    if not t or str(t.get("referee_pin", "")) != str(body.pin):
        raise HTTPException(status_code=401, detail="PIN incorrecto")
    doc = body.model_dump(exclude={"pin"})
    doc["match_id"] = mid
    doc["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.match_sheets.update_one(
        {"match_id": mid}, {"$set": doc}, upsert=True
    )
    return {"ok": True}


# ----------------- Referee PIN management (owner) -----------------
@api.get("/tournaments/{tid}/referee-pin")
async def get_pin(tid: str, user=Depends(get_current_user)):
    t = await _get_tournament_or_404(tid, user["id"])
    return {"pin": t.get("referee_pin")}


@api.post("/tournaments/{tid}/referee-pin")
async def rotate_pin(tid: str, user=Depends(get_current_user)):
    await _get_tournament_or_404(tid, user["id"])
    pin = str(random.randint(1000, 9999))
    await db.tournaments.update_one({"id": tid}, {"$set": {"referee_pin": pin}})
    return {"pin": pin}


@api.put("/tournaments/{tid}/referee-pin")
async def set_pin(tid: str, body: RefereePinUpdate, user=Depends(get_current_user)):
    await _get_tournament_or_404(tid, user["id"])
    await db.tournaments.update_one({"id": tid}, {"$set": {"referee_pin": body.pin}})
    return {"pin": body.pin}


# ----------------- Sponsors -----------------
@api.get("/tournaments/{tid}/sponsors")
async def list_sponsors(tid: str, user=Depends(get_current_user)):
    await _get_tournament_or_404(tid, user["id"])
    docs = await db.sponsors.find({"tournament_id": tid}, {"_id": 0}).to_list(200)
    return docs


@api.post("/tournaments/{tid}/sponsors")
async def add_sponsor(tid: str, body: SponsorIn, user=Depends(get_current_user)):
    await _get_tournament_or_404(tid, user["id"])
    doc = body.model_dump()
    doc["id"] = str(uuid.uuid4())
    doc["tournament_id"] = tid
    doc["created_at"] = datetime.now(timezone.utc).isoformat()
    await db.sponsors.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api.delete("/tournaments/{tid}/sponsors/{sid}")
async def delete_sponsor(tid: str, sid: str, user=Depends(get_current_user)):
    await _get_tournament_or_404(tid, user["id"])
    await db.sponsors.delete_one({"id": sid, "tournament_id": tid})
    return {"ok": True}


# ----------------- Playoffs (Liga) -----------------
def _compute_standings_for_cat(matches_list):
    tabla = {}
    for m in matches_list:
        for name, inst in [
            (m["local"], m["inst_local"]),
            (m["visitante"], m["inst_vis"]),
        ]:
            if name and name not in tabla:
                tabla[name] = {
                    "institucion": inst,
                    "pj": 0,
                    "pg": 0,
                    "pp": 0,
                    "pf": 0,
                    "pc": 0,
                }
    for m in matches_list:
        if m.get("status") != "played":
            continue
        l_, v_ = m["local"], m["visitante"]
        if l_ not in tabla or v_ not in tabla:
            continue
        tabla[l_]["pj"] += 1
        tabla[v_]["pj"] += 1
        tabla[l_]["pf"] += m.get("pts_favor_local", 0)
        tabla[l_]["pc"] += m.get("pts_favor_vis", 0)
        tabla[v_]["pf"] += m.get("pts_favor_vis", 0)
        tabla[v_]["pc"] += m.get("pts_favor_local", 0)
        if m.get("set_ganados_local", 0) > m.get("set_ganados_vis", 0):
            tabla[l_]["pg"] += 1
            tabla[v_]["pp"] += 1
        else:
            tabla[v_]["pg"] += 1
            tabla[l_]["pp"] += 1
    rows = []
    for n, st in tabla.items():
        dif = st["pf"] - st["pc"]
        ratio = round(st["pf"] / st["pc"], 3) if st["pc"] > 0 else float(st["pf"])
        rows.append({"equipo": n, **st, "dif": dif, "ratio": ratio})
    rows.sort(key=lambda x: (x["pg"], x["ratio"], x["dif"]), reverse=True)
    return rows


@api.post("/tournaments/{tid}/playoffs")
async def generate_playoffs(
    tid: str, body: PlayoffIn, user=Depends(get_current_user)
):
    t = await _get_tournament_or_404(tid, user["id"])
    if t["kind"] != "league":
        raise HTTPException(status_code=400, detail="Solo aplica a Ligas")
    cat = next((c for c in t["categorias"] if c["id"] == body.category_id), None)
    if not cat:
        raise HTTPException(status_code=404, detail="Categoría no encontrada")

    # Get category matches and compute standings
    cat_matches = await db.matches.find(
        {"tournament_id": tid, "category_id": body.category_id},
        {"_id": 0},
    ).to_list(5000)
    rows = _compute_standings_for_cat(cat_matches)
    if not rows:
        raise HTTPException(
            status_code=400,
            detail="Aún no hay partidos jugados en esta categoría.",
        )

    # Clear previous playoff matches for this category
    await db.matches.delete_many(
        {"tournament_id": tid, "category_id": body.category_id, "grupo": "Playoffs"}
    )

    new_matches = []

    def mk(local, visitante, fase, inst_l="-", inst_v="-"):
        return _new_match(
            {
                "local": local,
                "visitante": visitante,
                "inst_local": inst_l,
                "inst_vis": inst_v,
                "fase": fase,
                "grupo": "Playoffs",
            },
            tid,
            body.category_id,
            cat["rama"],
            jornada_id=None,
            status="draft",
        )

    if body.formato in ("top_8", "top_16", "top_32"):
        size = {"top_8": 8, "top_16": 16, "top_32": 32}[body.formato]
        top = rows[:size]
        if len(top) < size:
            raise HTTPException(
                status_code=400,
                detail=f"Se necesitan al menos {size} equipos (hay {len(top)}).",
            )
        # First round: 1 vs N, 2 vs N-1, etc.
        fase_map = {
            32: ("16avos", "Octavos", "Cuartos", "Semifinal", "Final"),
            16: ("Octavos", "Cuartos", "Semifinal", "Final"),
            8: ("Cuartos", "Semifinal", "Final"),
        }
        fases = fase_map[size]
        for i in range(size // 2):
            loc = top[i]
            vis = top[size - 1 - i]
            new_matches.append(
                mk(
                    loc["equipo"],
                    vis["equipo"],
                    f"{fases[0]} {i + 1}",
                    loc["institucion"],
                    vis["institucion"],
                )
            )
        # Subsequent rounds placeholders
        remaining = size // 4
        for fi, f in enumerate(fases[1:]):
            label_prev = fases[fi]
            for j in range(remaining):
                new_matches.append(
                    mk(
                        f"Ganador {label_prev} {j * 2 + 1}",
                        f"Ganador {label_prev} {j * 2 + 2}",
                        f if remaining == 1 else f"{f} {j + 1}",
                    )
                )
            remaining = max(1, remaining // 2)

    elif body.formato == "repechaje_2_4":
        if len(rows) < 6:
            raise HTTPException(
                status_code=400,
                detail="Se necesitan al menos 6 equipos para este formato.",
            )
        # 3 vs 6, 4 vs 5 (repechaje)
        new_matches.append(
            mk(
                rows[2]["equipo"],
                rows[5]["equipo"],
                "Repechaje 1",
                rows[2]["institucion"],
                rows[5]["institucion"],
            )
        )
        new_matches.append(
            mk(
                rows[3]["equipo"],
                rows[4]["equipo"],
                "Repechaje 2",
                rows[3]["institucion"],
                rows[4]["institucion"],
            )
        )
        # Semifinals: 1 vs ganador(Repechaje 2), 2 vs ganador(Repechaje 1)
        new_matches.append(
            mk(
                rows[0]["equipo"],
                "Ganador Repechaje 2",
                "Semifinal 1",
                rows[0]["institucion"],
                "-",
            )
        )
        new_matches.append(
            mk(
                rows[1]["equipo"],
                "Ganador Repechaje 1",
                "Semifinal 2",
                rows[1]["institucion"],
                "-",
            )
        )
        new_matches.append(
            mk("Ganador Semifinal 1", "Ganador Semifinal 2", "Final")
        )

    if new_matches:
        await db.matches.insert_many(new_matches)

    await db.tournaments.update_one(
        {"id": tid},
        {
            "$set": {
                f"formato_playoff_categorias.{body.category_id}": body.formato
            }
        },
    )
    return {"ok": True, "created": len(new_matches), "formato": body.formato}

    await _get_tournament_or_404(tid, user["id"])
    await db.tournaments.update_one({"id": tid}, {"$set": {"referee_pin": body.pin}})
    return {"pin": body.pin}

# ----------------- Health -----------------
@api.get("/")
async def root():
    return {"app": "VolleyPro", "ok": True}
# 1. Montamos la carpeta donde están tus archivos HTML/JS
# Asegúrate de que tu carpeta en GitHub se llame 'frontend'
app.mount("/static", StaticFiles(directory="frontend"), name="static")

# 2. Ruta principal: en lugar de dar error, envía tu index.html
@app.get("/")
async def serve_index():
    return FileResponse("frontend/index.html")

# 3. Mantenemos tus eventos de Startup originales
@app.on_event("startup")
async def startup():
    await db.users.create_index("email", unique=True)
    await db.tournaments.create_index([("user_id", 1), ("created_at", -1)])
    await db.tournaments.create_index("slug", unique=True)
    await db.matches.create_index("tournament_id")
    await db.matches.create_index("id", unique=True)

@app.on_event("shutdown")
async def shutdown():
    client.close()

# Mount router AFTER all decorators above
app.include_router(api)

# Tu configuración de CORS original
origins_env = os.environ.get("CORS_ORIGINS", "*")
origins = [o.strip() for o in origins_env.split(",") if o.strip()]
if origins == ["*"]:
    app.add_middleware(
        CORSMiddleware,
        allow_origin_regex=".*",
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
else:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

# ----------------- Startup -----------------
@app.on_event("startup")
async def startup():
    await db.users.create_index("email", unique=True)
    await db.tournaments.create_index([("user_id", 1), ("created_at", -1)])
    await db.tournaments.create_index("slug", unique=True)
    await db.matches.create_index("tournament_id")
    await db.matches.create_index("id", unique=True)


@app.on_event("shutdown")
async def shutdown():
    client.close()


# Mount router AFTER all decorators above
app.include_router(api)

# CORS — allow_credentials with wildcard requires regex
origins_env = os.environ.get("CORS_ORIGINS", "*")
origins = [o.strip() for o in origins_env.split(",") if o.strip()]
if origins == ["*"]:
    app.add_middleware(
        CORSMiddleware,
        allow_origin_regex=".*",
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
else:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )


