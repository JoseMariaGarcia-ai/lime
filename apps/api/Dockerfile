FROM node:20-alpine

WORKDIR /app

# @whiskeysockets/baileys depende de "libsignal", que npm instala clonando
# directamente desde GitHub (git+https) en vez de desde el registro de npm —
# node:20-alpine no trae git ni herramientas de compilación por defecto, y
# sin ellas "npm install" falla con "npm error enoent An unknown git error
# occurred" al no encontrar el binario de git.
RUN apk add --no-cache git python3 make g++

COPY package.json package-lock.json* ./
RUN npm install --omit=dev=false

COPY . .

RUN npm run build

ENV NODE_ENV=production
EXPOSE 3101

CMD ["npm", "start"]
