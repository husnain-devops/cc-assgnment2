FROM  node:16-alpine

WORKDIR /srv
ADD . .
RUN npm install

EXPOSE 3000
CMD ["node", "server.js"]
