# Test Credentials

## Admin (seeded for testing only — VolleyPro has user-scoped tournaments)
- email: admin@volleypro.com
- password: Admin123!

## Demo organizer (created at runtime by tests)
- email: demo@volleypro.com
- password: Demo123!
- name: Demo Organizador

## Auth endpoints
- POST /api/auth/register  { email, password, name }
- POST /api/auth/login     { email, password }
- GET  /api/auth/me        (cookie or Bearer)
- POST /api/auth/logout

## Notes
- Cookies are set httpOnly with samesite=lax
- All tournaments are scoped per `user_id`
