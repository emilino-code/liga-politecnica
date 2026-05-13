# VolleyPro · PRD

## Original problem statement (resumen)
Web para organizar **Torneos Rápidos** y **Ligas dominicales** de voleibol. Reemplaza un sistema Flask + JSON con problemas de empalmes de canchas, formularios rígidos, sin gestión de permisos y vista pública monolítica.

## User personas
- **Maestro/organizador** de liga dominical (no técnico, LatAm)
- **Equipos/jugadores** que consultan rol y tabla por link público

## Architecture
- **Backend**: FastAPI + Motor + MongoDB (`volley_pro` DB)
- **Auth**: JWT 7-day (Bearer en `Authorization` header, token en `localStorage` del front; cookies httpOnly también seteadas pero no usadas por el cliente debido a quirks de CORS en preview)
- **Frontend**: React 19 + Tailwind + shadcn UI + `@hello-pangea/dnd` + sonner + lucide-react
- **Fuentes**: Outfit (display) + Figtree (body)

## Core flows implementados
- Landing con dos CTAs grandes (Crear Liga / Torneo Rápido)
- Registro / Login / Logout con tokens en localStorage
- Dashboard de torneos del organizador (privados por user_id)
- Wizard **Crear Torneo Rápido** (categorías dinámicas, formato Round Robin o Grupos+Eliminatoria)
- Wizard **Crear Liga** (días/semana, horario inicio-fin, canchas globales, ida y vuelta)
- Detalle del torneo con 4 pestañas:
  - **Organizar**: jornadas (Liga) o partidos por categoría (Quick), con bolsa de pendientes
  - **Edición**: timeline drag & drop tipo Spotify (canchas como carriles, partidos como pills) + recalcular canchas (solo no jugados)
  - **Reagendar** (solo Liga): contador 2/equipo, mueve a draft o a otra jornada
  - **Vista previa**: configuración + métricas (total/draft/programados/jugados)
- Lógica **Mixta**: 1ra mitad solo femenil, 2da mitad solo varonil, mismas canchas
- Vista pública con buscador maestro unificado (filtra tablas Y partidos), filtro por rama (?rama=femenil|varonil)
- Anti-empalmes: el scheduler evita que un mismo equipo juegue 2 partidos a la misma hora

## Implemented (2026-02-05, v2)
- ✅ **Brand IPN**: paleta guinda (#800040) + amarillo (#FFD300) en todos los CTAs, tabs, badges
- ✅ **Bug fix**: inputs numéricos (canchas/duración) ahora usan string state, se pueden borrar y reescribir
- ✅ **Vista pública reorganizada**: tablas de posiciones primero, luego rol agrupado por fecha/jornada
- ✅ **Sección Árbitros** independiente en `/arbitro` (PIN por torneo, sin cuenta)
  - Buscador por equipo/hora/cancha + filtros de cancha y status
  - Vista separada sin acceso a organización
- ✅ **Simulador BETA Volleyball Referee**:
  - 6 titulares + líbero por equipo con nº y capitán
  - Setup → sorteo → juego con rotación clockwise automática al recuperar saque
  - Sustituciones por posición
  - Hoja persistida en `db.match_sheets`
  - Al finalizar partido, guarda score oficial automáticamente
- ✅ **PIN árbitros** en dashboard del torneo (ver/copiar/regenerar/editar)
- ✅ 40/40 backend tests pasando

## Backlog / próximos pasos
- **P1**: Editor de horario tipo Spotify ya está, pero falta UX para asignar `cancha 0` a partidos en draft (drag desde la bolsa al timeline).
- **P1**: Selector de formato de playoff (Top 8/16/32 + repechaje) post-temporada regular en Liga.
- **P2**: Compartir vista pública por rama con QR code.
- **P2**: Notificaciones push/email a equipos cuando su jornada se programa o reagenda.
- **P2**: Multi-organizador (compartir torneo con otros maestros, roles).
- **P3**: Métricas avanzadas (MVP por jornada, top puntos por equipo).
- **P3**: Modo offline (PWA) para canchas sin internet.

## Test credentials
Ver `/app/memory/test_credentials.md`
