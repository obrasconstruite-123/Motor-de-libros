# CONSTRUI-TE — despliegue de una sola URL

## Local con Docker

```bash
docker compose up --build
```

Abrir desde celular/PC en la misma red si se publica el puerto del equipo: `http://IP-DE-LA-PC:8080`.
En la misma PC: `http://localhost:8080`.

## Produccion con Render

El archivo `render.yaml` crea una app web y PostgreSQL. El frontend y la API viven bajo **el mismo dominio**, por lo que el usuario necesita un solo link.

## Usuarios demo

Password de demo: `construite123`
- `dueno@construite.com` — los 3 portales
- `cliente@gonzalez.com` — cliente
- `juan@construite.com` — personal

## Prueba E2E

Con el contenedor activo:
```bash
docker compose exec app sh -c 'BASE_URL=http://localhost:4000 node tests/e2e.mjs'
```

La prueba completa incluida en `backend/construite-backend/tests/e2e.mjs` puede ejecutarse dentro del contenedor desde `/app/tests/e2e.mjs`.

> Antes de producción cambiar la contraseña demo y no compartir JWT_SECRET.
