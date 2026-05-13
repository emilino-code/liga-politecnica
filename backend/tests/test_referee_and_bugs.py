"""
VolleyPro iteration 2 tests: referee PIN flow + numeric input string-coercion bug fixes.
Extends backend_test.py without breaking existing tests.
"""
import os
import uuid
import requests
import pytest

BASE_URL = os.environ["REACT_APP_BACKEND_URL"].rstrip("/") if "REACT_APP_BACKEND_URL" in os.environ else None
if not BASE_URL:
    with open("/app/frontend/.env") as f:
        for line in f:
            if line.startswith("REACT_APP_BACKEND_URL="):
                BASE_URL = line.split("=", 1)[1].strip().rstrip("/")
                break
API = f"{BASE_URL}/api"


def _rand_email(prefix="ref"):
    return f"TEST_{prefix}_{uuid.uuid4().hex[:8]}@volleypro.com"


@pytest.fixture(scope="module")
def organizer():
    s = requests.Session()
    email = _rand_email("org")
    r = s.post(f"{API}/auth/register", json={"email": email, "password": "Password123!", "name": "Org Ref"})
    assert r.status_code == 200, r.text
    data = r.json()
    s.headers.update({"Authorization": f"Bearer {data['token']}"})
    return {"session": s, "email": email, "id": data["id"], "token": data["token"]}


@pytest.fixture(scope="module")
def other_user():
    s = requests.Session()
    email = _rand_email("other")
    r = s.post(f"{API}/auth/register", json={"email": email, "password": "Password123!", "name": "Other"})
    assert r.status_code == 200, r.text
    data = r.json()
    s.headers.update({"Authorization": f"Bearer {data['token']}"})
    return {"session": s, "token": data["token"]}


def _quick_payload(canchas=2, duracion=45):
    return {
        "name": "TEST_Q_" + uuid.uuid4().hex[:6],
        "tipo_voley": "Sala",
        "canchas": canchas,
        "hora_inicio": "09:00",
        "duracion_bloque": duracion,
        "categorias": [{
            "nombre": "Sub-18 Femenil", "rama": "femenil", "formato": "round_robin",
            "teams": [
                {"nombre": "Tigres", "institucion": "ESC1"},
                {"nombre": "Lobos", "institucion": "ESC2"},
                {"nombre": "Pumas", "institucion": "ESC3"},
                {"nombre": "Aguilas", "institucion": "ESC4"},
            ],
        }],
    }


def _league_payload(canchas=2, duracion=45):
    return {
        "name": "TEST_L_" + uuid.uuid4().hex[:6],
        "tipo_voley": "Sala",
        "canchas": canchas,
        "dias_por_semana": 1,
        "dias": ["domingo"],
        "hora_inicio": "09:00",
        "hora_fin": "18:00",
        "duracion_bloque": duracion,
        "ida_y_vuelta": False,
        "formato_playoff": None,
        "categorias": [{
            "nombre": "Sub-18 Femenil", "rama": "femenil", "formato": "round_robin",
            "teams": [
                {"nombre": "FemA", "institucion": "I1"},
                {"nombre": "FemB", "institucion": "I2"},
                {"nombre": "FemC", "institucion": "I3"},
                {"nombre": "FemD", "institucion": "I4"},
            ],
        }],
    }


# -------- BUG FIX: numeric inputs as strings --------
class TestStringCoercion:
    """Pydantic should coerce '2' -> 2 for ints (canchas, duracion_bloque)."""

    def test_quick_with_string_canchas(self, organizer):
        p = _quick_payload()
        p["canchas"] = "2"
        p["duracion_bloque"] = "45"
        r = organizer["session"].post(f"{API}/tournaments/quick", json=p)
        assert r.status_code == 200, r.text
        data = r.json()
        assert "id" in data and data["kind"] == "quick"

    def test_league_with_string_canchas(self, organizer):
        p = _league_payload()
        p["canchas"] = "2"
        p["duracion_bloque"] = "45"
        r = organizer["session"].post(f"{API}/tournaments/league", json=p)
        assert r.status_code == 200, r.text
        assert r.json()["kind"] == "league"


# -------- NEW: Referee PIN auto-generation --------
class TestRefereePinGeneration:
    def test_quick_auto_generates_pin(self, organizer):
        r = organizer["session"].post(f"{API}/tournaments/quick", json=_quick_payload())
        assert r.status_code == 200
        tid = r.json()["id"]
        slug = r.json()["slug"]
        pin_r = organizer["session"].get(f"{API}/tournaments/{tid}/referee-pin")
        assert pin_r.status_code == 200
        pin = pin_r.json()["pin"]
        assert pin and len(str(pin)) == 4 and str(pin).isdigit()
        pytest.q_tid = tid
        pytest.q_slug = slug
        pytest.q_pin = pin

    def test_league_auto_generates_pin(self, organizer):
        r = organizer["session"].post(f"{API}/tournaments/league", json=_league_payload())
        assert r.status_code == 200
        tid = r.json()["id"]
        slug = r.json()["slug"]
        pin_r = organizer["session"].get(f"{API}/tournaments/{tid}/referee-pin")
        assert pin_r.status_code == 200
        pin = pin_r.json()["pin"]
        assert pin and len(str(pin)) == 4 and str(pin).isdigit()
        # Schedule a jornada to materialize matches into "scheduled"
        jr = organizer["session"].post(
            f"{API}/tournaments/{tid}/jornadas",
            json={"fecha": "2026-03-01", "modo": "femenil", "hora_inicio": "09:00", "hora_fin": "12:00"},
        )
        assert jr.status_code == 200, jr.text
        pytest.l_tid = tid
        pytest.l_slug = slug
        pytest.l_pin = pin

    def test_get_pin_owner_only(self, organizer, other_user):
        r = other_user["session"].get(f"{API}/tournaments/{pytest.q_tid}/referee-pin")
        assert r.status_code == 404  # ownership scoping returns 404, not 403

    def test_rotate_pin(self, organizer):
        old = pytest.q_pin
        r = organizer["session"].post(f"{API}/tournaments/{pytest.q_tid}/referee-pin")
        assert r.status_code == 200
        new = r.json()["pin"]
        assert new and str(new) != str(old)
        # Old pin should now be invalid for referee auth
        bad = requests.post(f"{API}/referee/auth", json={"slug": pytest.q_slug, "pin": str(old)})
        assert bad.status_code == 401
        pytest.q_pin = new

    def test_rotate_pin_other_user_blocked(self, other_user):
        r = other_user["session"].post(f"{API}/tournaments/{pytest.q_tid}/referee-pin")
        assert r.status_code == 404


# -------- NEW: Referee auth + matches + result --------
class TestRefereeFlow:
    def test_referee_auth_correct(self):
        r = requests.post(f"{API}/referee/auth", json={"slug": pytest.q_slug, "pin": str(pytest.q_pin)})
        assert r.status_code == 200
        body = r.json()
        assert body["ok"] is True
        assert "tournament" in body
        # PIN and user_id must NOT leak
        assert "referee_pin" not in body["tournament"]
        assert "user_id" not in body["tournament"]

    def test_referee_auth_wrong_pin(self):
        r = requests.post(f"{API}/referee/auth", json={"slug": pytest.q_slug, "pin": "0000"})
        assert r.status_code == 401

    def test_referee_auth_unknown_slug(self):
        r = requests.post(f"{API}/referee/auth", json={"slug": "no-existe-xyz", "pin": "1234"})
        assert r.status_code == 404

    def test_referee_matches_correct(self):
        r = requests.get(f"{API}/referee/{pytest.q_slug}/matches", params={"pin": str(pytest.q_pin)})
        assert r.status_code == 200
        body = r.json()
        assert "matches" in body and len(body["matches"]) > 0
        assert "referee_pin" not in body["tournament"]
        pytest.q_match_id = body["matches"][0]["id"]

    def test_referee_matches_wrong_pin(self):
        r = requests.get(f"{API}/referee/{pytest.q_slug}/matches", params={"pin": "9999"})
        # Wrong pin (assuming new pin isn't 9999, retry once)
        if r.status_code != 401:
            r = requests.get(f"{API}/referee/{pytest.q_slug}/matches", params={"pin": "0000"})
        assert r.status_code == 401

    def test_referee_submit_result(self):
        mid = pytest.q_match_id
        r = requests.post(
            f"{API}/referee/matches/{mid}/result",
            json={"pin": str(pytest.q_pin), "sets": [[25, 20], [22, 25], [25, 18]]},
        )
        assert r.status_code == 200, r.text
        assert r.json()["score"] == "2-1"

    def test_referee_submit_result_wrong_pin(self):
        mid = pytest.q_match_id
        r = requests.post(
            f"{API}/referee/matches/{mid}/result",
            json={"pin": "0000", "sets": [[25, 20], [25, 22]]},
        )
        assert r.status_code == 401

    def test_referee_submit_result_unknown_match(self):
        r = requests.post(
            f"{API}/referee/matches/does-not-exist/result",
            json={"pin": str(pytest.q_pin), "sets": [[25, 20]]},
        )
        assert r.status_code == 404


# -------- NEW: Match sheet (BETA simulator) --------
class TestMatchSheet:
    def test_put_sheet(self):
        mid = pytest.q_match_id
        sheet = {
            "pin": str(pytest.q_pin),
            "players_local": [{"num": 1, "nombre": "Ana"}, {"num": 2, "nombre": "Bea"}],
            "players_vis": [{"num": 3, "nombre": "Cleo"}, {"num": 4, "nombre": "Dora"}],
            "positions_local": ["1", "2", None, None, None, None],
            "positions_vis": ["3", "4", None, None, None, None],
            "serving": "local",
            "current_set": 1,
            "sets": [{"local": 0, "vis": 0}],
            "score_local": 0,
            "score_vis": 0,
            "substitutions": [],
            "enabled": True,
        }
        r = requests.put(f"{API}/referee/matches/{mid}/sheet", json=sheet)
        assert r.status_code == 200, r.text
        assert r.json()["ok"] is True

    def test_get_sheet(self):
        mid = pytest.q_match_id
        r = requests.get(
            f"{API}/referee/matches/{mid}/sheet",
            params={"slug": pytest.q_slug, "pin": str(pytest.q_pin)},
        )
        assert r.status_code == 200
        body = r.json()
        assert body.get("match_id") == mid
        assert body.get("serving") == "local"
        assert body.get("enabled") is True
        assert "_id" not in body

    def test_get_sheet_wrong_pin(self):
        mid = pytest.q_match_id
        r = requests.get(
            f"{API}/referee/matches/{mid}/sheet",
            params={"slug": pytest.q_slug, "pin": "0000"},
        )
        assert r.status_code == 401

    def test_put_sheet_wrong_pin(self):
        mid = pytest.q_match_id
        r = requests.put(
            f"{API}/referee/matches/{mid}/sheet",
            json={"pin": "0000", "players_local": [], "players_vis": [],
                  "positions_local": [], "positions_vis": [], "sets": []},
        )
        assert r.status_code == 401

    def test_get_empty_sheet_for_other_match(self):
        # Another match (no sheet stored yet) should return {}
        r = requests.get(f"{API}/referee/{pytest.l_slug}/matches", params={"pin": str(pytest.l_pin)})
        assert r.status_code == 200
        ms = r.json()["matches"]
        assert len(ms) > 0
        other_mid = ms[0]["id"]
        sr = requests.get(
            f"{API}/referee/matches/{other_mid}/sheet",
            params={"slug": pytest.l_slug, "pin": str(pytest.l_pin)},
        )
        assert sr.status_code == 200
        assert sr.json() == {}
