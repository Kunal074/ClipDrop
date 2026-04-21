FROM node:20-slim

# Install LibreOffice + dependencies
RUN apt-get update && apt-get install -y \
    libreoffice \
    libreoffice-writer \
    libreoffice-calc \
    libreoffice-impress \
    fonts-liberation \
    --no-install-recommends \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Generate Prisma client
COPY prisma ./prisma
RUN npx prisma generate

# Copy the rest of the app
COPY . .

# Build Next.js
RUN npm run build

# Optimize Node memory for 512MB limit
ENV NODE_OPTIONS="--max-old-space-size=400"

EXPOSE 3000

CMD ["sh", "-c", "npx prisma db push && npm start"]
