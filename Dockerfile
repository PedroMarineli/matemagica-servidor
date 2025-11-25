FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# --- CORREÇÃO: Cria a estrutura de pastas para uploads manualmente ---
RUN mkdir -p ./matemagica/public/images/students

EXPOSE 3000

CMD ["npm", "start"]