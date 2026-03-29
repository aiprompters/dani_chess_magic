# Stage 1: Build client
FROM node:20-alpine AS client-build
WORKDIR /app
COPY shared/ ./shared/
COPY client/package*.json ./client/
RUN cd client && npm ci
COPY client/ ./client/
RUN cd client && npx vite build

# Stage 2: Build server
FROM node:20-alpine AS server-build
WORKDIR /app
COPY shared/ ./shared/
COPY server/package*.json ./server/
RUN cd server && npm ci
COPY server/ ./server/
RUN cd server && npx tsc

# Stage 3: Production
FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production

COPY server/package*.json ./server/
RUN cd server && npm ci --omit=dev

COPY --from=server-build /app/server/dist/ ./server/dist/
COPY --from=server-build /app/shared/ ./shared/
COPY --from=client-build /app/client/dist/ ./client/dist/

EXPOSE 3001

CMD ["node", "server/dist/server/src/index.js"]
