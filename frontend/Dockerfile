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

# ===== STAGE 2: SERVE (Uses Nginx) =====
FROM nginx:alpine

# Copy the BUILT files from stage 1
COPY --from=build /app/dist /usr/share/nginx/html

# Copy nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port
EXPOSE 80

# Start nginx (serves the static files)
CMD ["nginx", "-g", "daemon off;"]
