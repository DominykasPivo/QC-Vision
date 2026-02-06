FROM node:22-alpine AS build

WORKDIR /app

COPY package*.json ./

RUN npm install


COPY . .

# Expose port
EXPOSE 3000

# Start Vite dev server with hot reload
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]