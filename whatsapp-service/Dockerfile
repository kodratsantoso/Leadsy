FROM node:22.23.4-alpine

WORKDIR /usr/src/app

RUN apk add --no-cache git
COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 3002

CMD [ "npm", "start" ]
