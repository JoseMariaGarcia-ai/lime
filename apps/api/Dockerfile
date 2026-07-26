FROM node:20-alpine

WORKDIR /app

RUN apk add --no-cache git python3 make g++

COPY package.json package-lock.json* ./
RUN npm install --omit=dev=false

COPY . .

RUN npm run build

ENV NODE_ENV=production
EXPOSE 3101

CMD ["npm", "start"]
