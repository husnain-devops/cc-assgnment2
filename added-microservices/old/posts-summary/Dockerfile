FROM node:18
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm install && npm install nodemailer
COPY . .
CMD ["node", "server.js"]
EXPOSE 4000

