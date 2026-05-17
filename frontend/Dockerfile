FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci --no-audit --no-fund

COPY . .

RUN chmod +x docker-entrypoint.sh

EXPOSE 3000

ENTRYPOINT ["sh", "/app/docker-entrypoint.sh"]
