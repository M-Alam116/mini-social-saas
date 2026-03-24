FROM node:22-alpine

# Install PM2 globally
RUN npm install pm2 -g

WORKDIR /usr/src/app

# Copy package files and install dependencies
COPY package*.json ./
COPY prisma ./prisma/
RUN npm install --no-audit --no-fund

# Generate Prisma Client
RUN npx prisma generate

# Copy source code and build
COPY . .
RUN npm run build

# Expose the API port
EXPOSE 3000

# Run PM2 using the ecosystem config
CMD ["pm2-runtime", "ecosystem.config.js"]
