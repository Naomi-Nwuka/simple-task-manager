FROM node:alpine3.23

WORKDIR /app

COPY app/ /app/

RUN npm install

EXPOSE 3000

CMD ["node", "server.js"]
