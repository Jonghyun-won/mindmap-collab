FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY apps/server/package*.json ./apps/server/

# Install dependencies
RUN npm install --workspace=apps/server

# Copy source code
COPY apps/server ./apps/server

# Build
WORKDIR /app/apps/server
RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
