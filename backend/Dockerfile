FROM node:alpine3.23

WORKDIR /app

COPY backend/ /app/

RUN npm install

EXPOSE 3000

CMD ["node", "server.js"]
