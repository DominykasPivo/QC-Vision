# ===== STAGE 1: BUILD (Uses Node) =====
FROM node:18-alpine AS build

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Build React app (creates static HTML/JS/CSS files in /dist)
RUN npm run build

# Expose port
EXPOSE 3000

# Start Vite dev server with hot reload
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
