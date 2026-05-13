"""
VolleyPro backend regression tests.
Covers: auth, quick & league tournament creation, ownership scoping,
jornada modes (femenil/varonil/mixto), match patch, result, reagendar
limits, recalcular, public view + branch filter.
"""
import os
import uuid
import requests
import pytest

BASE_URL = os.environ["REACT_APP_BACKEND_URL"].rstrip("/") if "REACT_APP_BACKEND_URL" in os.environ else None
if not BASE_URL:
    # Fallback to reading frontend .env
    with open("/app/frontend/.env") as f:
        for line in f:
            if line.startswith("REACT_APP_BACKEND_URL="):
                BASE_URL = line.split("=", 1)[1].strip().rstrip("/")
                break
API = f"{BASE_URL}/api"


def _rand_email(prefix="test"):
    return f"TEST_{prefix}_{uuid.uuid4().hex[:8]}@volleypro.com"


@pytest.fixture(scope="module")
def user_a():
    s = requests.Session()
    email = _rand_email("a")
    r = s.post(f"{API}/auth/register", json={"email": email, "password": "Password123!", "name": "User A"})
    assert r.status_code == 200, r.text
    data = r.json()
    s.headers.update({"Authorization": f"Bearer {data['token']}"})
    return {"session": s, "email": email, "token": data["token"], "id": data["id"]}


@pytest.fixture(scope="module")
def user_b():
    s = requests.Session()
    email = _rand_email("b")
    r = s.post(f"{API}/auth/register", json={"email": email, "password": "Password123!", "name": "User B"})
    assert r.status_code == 200, r.text
    data = r.json()
    s.headers.update({"Authorization": f"Bearer {data['token']}"})
    return {"session": s, "email": email, "token": data["token"], "id": data["id"]}


# -------- Auth --------
class TestAuth:
    def test_health(self):
        r = requests.get(f"{API}/")
        assert r.status_code == 200
        assert r.json().get("ok") is True

    def test_register_and_me(self, user_a):
        r = user_a["session"].get(f"{API}/auth/me")
        assert r.status_code == 200
        body = r.json()
        assert body["email"].lower() == user_a["email"].lower()
        assert body["id"] == user_a["id"]
        assert body["name"] == "User A"

    def test_login_wrong_password(self, user_a):
        r = requests.post(f"{API}/auth/login", json={"email": user_a["email"], "password": "WRONG!"})
        assert r.status_code == 401

    def test_login_correct(self, user_a):
        r = requests.post(f"{API}/auth/login", json={"email": user_a["email"], "password": "Password123!"})
        assert r.status_code == 200
        assert "token" in r.json()

    def test_me_without_token(self):
        r = requests.get(f"{API}/auth/me")
        assert r.status_code == 401

    def test_register_duplicate_email(self, user_a):
        r = requests.post(f"{API}/auth/register", json={"email": user_a["email"], "password": "Password123!", "name": "X"})
        assert r.status_code == 400


# -------- Quick tournament --------
def _quick_payload():
    return {
        "name": "TEST_Quick_" + uuid.uuid4().hex[:6],
        "tipo_voley": "Sala",
        "canchas": 2,
        "hora_inicio": "09:00",
        "duracion_bloque": 45,
        "categorias": [
            {
                "nombre": "Sub-18 Femenil",
                "rama": "femenil",
                "formato": "round_robin",
                "teams": [
                    {"nombre": "Tigres", "institucion": "ESC1"},
                    {"nombre": "Lobos", "institucion": "ESC2"},
                    {"nombre": "Pumas", "institucion": "ESC3"},
                    {"nombre": "Aguilas", "institucion": "ESC4"},
                ],
            }
        ],
    }


class TestQuick:
    def test_create_quick(self, user_a):
        r = user_a["session"].post(f"{API}/tournaments/quick", json=_quick_payload())
        assert r.status_code == 200, r.text
        data = r.json()
        assert "id" in data and "slug" in data
        assert data["kind"] == "quick"
        # GET by id
        r2 = user_a["session"].get(f"{API}/tournaments/{data['id']}")
        assert r2.status_code == 200
        body = r2.json()
        assert body["tournament"]["id"] == data["id"]
        # Round robin of 4 = 6 matches
        assert len(body["matches"]) == 6
        for m in body["matches"]:
            assert m["status"] == "scheduled"
            assert m["hora"]
            assert m["cancha"] in (1, 2)
        pytest.tournament_quick_id = data["id"]
        pytest.tournament_quick_slug = data["slug"]


# -------- League tournament --------
def _league_payload():
    return {
        "name": "TEST_League_" + uuid.uuid4().hex[:6],
        "tipo_voley": "Sala",
        "canchas": 2,
        "dias_por_semana": 1,
        "dias": ["domingo"],
        "hora_inicio": "09:00",
        "hora_fin": "18:00",
        "duracion_bloque": 45,
        "ida_y_vuelta": False,
        "formato_playoff": None,
        "categorias": [
            {
                "nombre": "Sub-18 Femenil",
                "rama": "femenil",
                "formato": "round_robin",
                "teams": [
                    {"nombre": "FemA", "institucion": "I1"},
                    {"nombre": "FemB", "institucion": "I2"},
                    {"nombre": "FemC", "institucion": "I3"},
                    {"nombre": "FemD", "institucion": "I4"},
                ],
            },
            {
                "nombre": "Sub-18 Varonil",
                "rama": "varonil",
                "formato": "round_robin",
                "teams": [
                    {"nombre": "VarA", "institucion": "I1"},
                    {"nombre": "VarB", "institucion": "I2"},
                    {"nombre": "VarC", "institucion": "I3"},
                    {"nombre": "VarD", "institucion": "I4"},
                ],
            },
        ],
    }


class TestLeague:
    def test_create_league_drafts(self, user_a):
        r = user_a["session"].post(f"{API}/tournaments/league", json=_league_payload())
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["kind"] == "league"
        tid = data["id"]
        r2 = user_a["session"].get(f"{API}/tournaments/{tid}")
        body = r2.json()
        assert len(body["matches"]) == 12  # 6 fem + 6 var
        for m in body["matches"]:
            assert m["status"] == "draft"
            assert m["jornada_id"] is None
        pytest.tournament_league_id = tid
        pytest.tournament_league_slug = data["slug"]

    def test_jornada_femenil(self, user_a):
        tid = pytest.tournament_league_id
        r = user_a["session"].post(
            f"{API}/tournaments/{tid}/jornadas",
            json={"fecha": "2026-02-01", "modo": "femenil", "hora_inicio": "09:00", "hora_fin": "12:00"},
        )
        assert r.status_code == 200, r.text
        # Verify matches assigned are femenil only
        body = user_a["session"].get(f"{API}/tournaments/{tid}").json()
        scheduled = [m for m in body["matches"] if m["status"] == "scheduled"]
        assert len(scheduled) > 0
        assert all(m["branch"] == "femenil" for m in scheduled)

    def test_jornada_varonil(self, user_a):
        tid = pytest.tournament_league_id
        r = user_a["session"].post(
            f"{API}/tournaments/{tid}/jornadas",
            json={"fecha": "2026-02-08", "modo": "varonil", "hora_inicio": "09:00", "hora_fin": "12:00"},
        )
        assert r.status_code == 200, r.text
        body = user_a["session"].get(f"{API}/tournaments/{tid}").json()
        # the new jornada is the 2nd one
        jornadas = body["tournament"]["jornadas"]
        assert len(jornadas) == 2
        var_jid = jornadas[-1]["id"]
        var_matches = [m for m in body["matches"] if m["jornada_id"] == var_jid]
        assert all(m["branch"] == "varonil" for m in var_matches)

    def test_jornada_mixto(self, user_a):
        # New league for mixto test
        r = user_a["session"].post(f"{API}/tournaments/league", json=_league_payload())
        tid = r.json()["id"]
        r2 = user_a["session"].post(
            f"{API}/tournaments/{tid}/jornadas",
            json={"fecha": "2026-02-15", "modo": "mixto", "hora_inicio": "09:00", "hora_fin": "18:00"},
        )
        assert r2.status_code == 200, r2.text
        body = user_a["session"].get(f"{API}/tournaments/{tid}").json()
        scheduled = [m for m in body["matches"] if m["status"] == "scheduled"]
        fem = [m for m in scheduled if m["branch"] == "femenil"]
        var = [m for m in scheduled if m["branch"] == "varonil"]
        assert len(fem) > 0 and len(var) > 0
        # femenil hours should all be earlier than varonil hours (1st half / 2nd half)
        max_fem = max(m["hora"] for m in fem)
        min_var = min(m["hora"] for m in var)
        assert max_fem <= min_var, f"fem max {max_fem} should be <= var min {min_var}"

    def test_ownership_scoping(self, user_a, user_b):
        # B should not see A's tournaments and cannot fetch by id
        r = user_b["session"].get(f"{API}/tournaments")
        assert r.status_code == 200
        ids = [t["id"] for t in r.json()]
        assert pytest.tournament_league_id not in ids
        r2 = user_b["session"].get(f"{API}/tournaments/{pytest.tournament_league_id}")
        assert r2.status_code == 404


# -------- Match operations --------
class TestMatchOps:
    def test_patch_match_drag(self, user_a):
        # Use quick tournament — pick first match
        body = user_a["session"].get(f"{API}/tournaments/{pytest.tournament_quick_id}").json()
        m = body["matches"][0]
        r = user_a["session"].patch(f"{API}/matches/{m['id']}", json={"hora": "11:00", "cancha": 2})
        assert r.status_code == 200
        body2 = user_a["session"].get(f"{API}/tournaments/{pytest.tournament_quick_id}").json()
        m2 = next(x for x in body2["matches"] if x["id"] == m["id"])
        assert m2["hora"] == "11:00"
        assert m2["cancha"] == 2

    def test_submit_result(self, user_a):
        body = user_a["session"].get(f"{API}/tournaments/{pytest.tournament_quick_id}").json()
        m = body["matches"][1]
        r = user_a["session"].post(
            f"{API}/matches/{m['id']}/result",
            json={"sets": [[25, 20], [25, 22]]},
        )
        assert r.status_code == 200
        assert r.json()["score"] == "2-0"
        body2 = user_a["session"].get(f"{API}/tournaments/{pytest.tournament_quick_id}").json()
        m2 = next(x for x in body2["matches"] if x["id"] == m["id"])
        assert m2["status"] == "played"
        assert m2["set_ganados_local"] == 2
        assert m2["set_ganados_vis"] == 0

    def test_reagendar_max2(self, user_a):
        # Get league matches that are currently scheduled
        tid = pytest.tournament_league_id
        body = user_a["session"].get(f"{API}/tournaments/{tid}").json()
        scheduled = [m for m in body["matches"] if m["status"] == "scheduled" and m["branch"] == "femenil"]
        assert len(scheduled) >= 3, "Need at least 3 scheduled matches to test max-2 reagendados"
        # Find a team that appears in multiple matches and reagendar 3 times
        from collections import Counter
        team_count = Counter()
        for m in scheduled:
            team_count[m["local"]] += 1
            team_count[m["visitante"]] += 1
        target_team = team_count.most_common(1)[0][0]
        target_matches = [m for m in scheduled if target_team in (m["local"], m["visitante"])]
        assert len(target_matches) >= 3
        # 1st reagendar
        r1 = user_a["session"].post(f"{API}/matches/{target_matches[0]['id']}/reagendar", json={"destino": "draft"})
        assert r1.status_code == 200, r1.text
        # 2nd reagendar
        r2 = user_a["session"].post(f"{API}/matches/{target_matches[1]['id']}/reagendar", json={"destino": "draft"})
        assert r2.status_code == 200, r2.text
        # 3rd should fail
        r3 = user_a["session"].post(f"{API}/matches/{target_matches[2]['id']}/reagendar", json={"destino": "draft"})
        assert r3.status_code == 400

    def test_recalcular(self, user_a):
        # Create a fresh quick tournament to recalcular cleanly
        r = user_a["session"].post(f"{API}/tournaments/quick", json=_quick_payload())
        tid = r.json()["id"]
        rr = user_a["session"].post(f"{API}/tournaments/{tid}/recalcular", json={"nuevas_canchas": 1})
        assert rr.status_code == 200
        body = user_a["session"].get(f"{API}/tournaments/{tid}").json()
        for m in body["matches"]:
            if m["status"] != "played":
                assert m["cancha"] == 1


# -------- Public view --------
class TestPublic:
    def test_public_view(self, user_a):
        slug = pytest.tournament_quick_slug
        r = requests.get(f"{API}/public/{slug}")
        assert r.status_code == 200
        body = r.json()
        assert body["tournament"]["slug"] == slug
        assert "user_id" not in body["tournament"]
        assert "matches" in body and "standings" in body

    def test_public_branch_filter(self, user_a):
        slug = pytest.tournament_league_slug
        r = requests.get(f"{API}/public/{slug}", params={"branch": "femenil"})
        assert r.status_code == 200
        body = r.json()
        for m in body["matches"]:
            assert m["branch"] == "femenil"

    def test_public_404(self):
        r = requests.get(f"{API}/public/no-existe-xyz")
        assert r.status_code == 404


# -------- Cleanup --------
class TestCleanup:
    def test_delete_tournament(self, user_a):
        # Delete one of A's tournaments
        r = user_a["session"].get(f"{API}/tournaments")
        ids = [t["id"] for t in r.json()]
        if ids:
            d = user_a["session"].delete(f"{API}/tournaments/{ids[0]}")
            assert d.status_code == 200
            # Verify gone
            g = user_a["session"].get(f"{API}/tournaments/{ids[0]}")
            assert g.status_code == 404
