FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY prisma ./prisma
RUN npx prisma generate

FROM node:20-alpine AS runtime
RUN apk add --no-cache wget
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY src ./src
COPY prisma ./prisma
COPY package.json ./
ENV NODE_ENV=production
ENV PORT=5000
EXPOSE 5000
HEALTHCHECK --interval=10s --timeout=5s --retries=5 CMD wget -qO- http://localhost:5000/health || exit 1
CMD ["node", "src/server.js"]
