---
description: Reset PostgreSQL DB, recreate, migrate and seed demo data
---

Resetea la base de datos del proyecto desde cero:

1. Drop de la BD `cogniroom` en Postgres (confirma con el usuario antes).
2. Crea de nuevo la BD vacía.
3. Borra todas las migraciones de las apps custom (mantén `__init__.py`).
4. Ejecuta `makemigrations users rooms questions evaluation_sessions cognitive`.
5. Ejecuta `migrate`.
6. Ejecuta `seed_demo`.
7. Confirma que todo corrió bien mostrando el output del seed.

**IMPORTANTE**: Esto destruye todos los datos. Pide confirmación explícita antes del paso 1.
