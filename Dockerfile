FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json* ./

COPY . .

RUN chmod +x docker-entrypoint.sh

EXPOSE 3000

ENTRYPOINT ["sh", "/app/docker-entrypoint.sh"]
