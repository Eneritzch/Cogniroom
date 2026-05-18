---
description: Test the full evaluation flow via curl/HTTPie against the running server
---

Prueba el flujo completo de evaluación contra el servidor corriendo en `http://127.0.0.1:8000`:

1. Login como `student1@cogniroom.com` / `password123` → captura el access token.
2. `GET /api/auth/me/` para confirmar identidad.
3. `GET /api/rooms/` para listar salas del estudiante.
4. `POST /api/sessions/` con `room_id` de la sala "Algoritmos I".
5. `GET /api/sessions/{id}/next-question/` para obtener pregunta adaptativa.
6. `POST /api/sessions/{id}/answer/` con respuesta + `confidence_declared`.
7. Mostrar el JSON resultante (icc_value, metacognitive_gap, profile, bkt_mastery, risk_level, ai_feedback).
8. `POST /api/sessions/{id}/complete/` para cerrar la sesión.
9. `GET /api/cognitive/my-profile/` para ver el perfil cognitivo final.

Reporta cada paso con su respuesta. Si algún paso falla, detente y diagnostica.
