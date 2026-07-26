# Lime AI Studio — Centro de gestión

Panel interno de **Lime AI Studio** para gestionar clientes, automatizaciones de
WhatsApp con IA, agenda y workflows. Proyecto **independiente de ConsentsPro**:
vive en la carpeta `lime/` de este repositorio solo por comodidad de desarrollo,
pero está pensado para desplegarse como un **proyecto Railway aparte** (su propio
backend, frontend y base de datos PostgreSQL), sin compartir nada con ConsentsPro.

## Estructura

```
lime/
  apps/
    api/    Backend Express + TypeScript + PostgreSQL (pg, sin ORM)
    web/    Frontend React + TypeScript + Tailwind (Vite)
```

Mismo patrón que ConsentsPro: migraciones SQL numeradas en `apps/api/migrations`,
aplicadas automáticamente al arrancar el servidor (`schema_migrations` para no
repetirlas), JWT para auth, `pg.Pool` directo sin ORM.

## Módulos

- **Clientes**: nombre, apellidos, empresa, teléfono, email + claves de API
  (n8n, OpenRouter, Claude, YCloud) por cliente + campos personalizables
  ilimitados (defínelos una vez en Clientes → Campos personalizados).
- **WhatsApp**: conversaciones por cliente, envío/recepción. Cada cliente elige
  su proveedor: **YCloud** (API oficial de Meta, estable) o **Baileys**
  (WhatsApp Web no oficial, conexión por QR, sin depender de Meta).
- **Agenda**: citas/reuniones, opcionalmente vinculadas a un cliente.
- **Configuración de cuenta**: claves de API globales de Lime (YCloud,
  OpenRouter, Claude, n8n) + campos personalizables propios.
- **Workflows**: crear automatizaciones y activarlas/desactivarlas.

## Despliegue en Railway (proyecto nuevo)

1. Crea un proyecto Railway nuevo (no reutilices el de ConsentsPro).
2. Añade una base de datos PostgreSQL nueva al proyecto.
3. Servicio backend: root directory `lime/apps/api`, build con Dockerfile
   incluido (o Nixpacks detectando Node). Variables de entorno: ver
   `.env.example` de `apps/api`.
4. Servicio frontend: root directory `lime/apps/web`, build estático (`npm run
   build`, sirve `dist/`). Variable `VITE_API_URL` apuntando al backend.
5. Genera `LIME_JWT_SECRET` y `LIME_ENCRYPTION_KEY` con `openssl rand -hex 32`
   cada una (dos claves distintas) — sin `LIME_ENCRYPTION_KEY` el backend no
   arranca, porque cifra en reposo las claves de API de clientes/cuenta.

## Primer arranque

No hay usuarios preconfigurados ni contraseñas inventadas. La primera vez que
se abre el panel, si no existe ningún usuario todavía, se muestra una pantalla
de configuración inicial para crear el primer administrador.

## Baileys (WhatsApp no oficial)

La sesión de cada cliente conectado por Baileys se guarda en
`apps/api/data/baileys/<clientId>/` (ficheros de credenciales). En Railway,
monta un **volumen persistente** en esa ruta (`lime/apps/api/data`) — si no,
la sesión se pierde en cada redeploy y habrá que volver a escanear el QR.
