# ── Build stage ──────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Vite hornea las variables de entorno en tiempo de build — hay que
# declararlas como ARG+ENV o el frontend compilado apuntaría a "" (mismo
# origen) en vez de a la URL real del backend.
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

COPY package.json package-lock.json* ./
RUN npm install

COPY . .
RUN npm run build

# ── Serve stage ───────────────────────────────────────────────
FROM nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html

# SPA fallback: cualquier ruta → index.html, igual que en ConsentsPro
# (ver Dockerfile de la raíz del repo) — index.html nunca se cachea porque
# su nombre no cambia entre despliegues (a diferencia del JS/CSS con hash).
RUN printf 'server {\n\
  listen 80;\n\
  root /usr/share/nginx/html;\n\
  index index.html;\n\
  location = /index.html {\n\
    add_header Cache-Control "no-cache, no-store, must-revalidate";\n\
  }\n\
  location / {\n\
    try_files $uri $uri/ /index.html;\n\
  }\n\
}\n' > /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
