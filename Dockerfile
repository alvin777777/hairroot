# HairRoot production image, adapted from the CPE 334 Lab 5 Starter Kit.
# One container serves the API and the built React UI. Secrets are never baked in: DATABASE_URL and
# SEED_DEMO_PASSWORD are injected at run time (Secret Manager on GCP, .env with docker compose).

# Stage 1: build the UI. An empty API URL makes the UI call the API on the same origin.
FROM node:24-alpine AS client-builder
WORKDIR /app/client
COPY client/package*.json ./
RUN npm ci
COPY client/ ./
ENV VITE_API_URL=""
RUN npm run build

# Stage 2: build the API and generate the Prisma client.
FROM node:24-alpine AS server-builder
WORKDIR /app/server
RUN apk add --no-cache openssl
COPY server/package*.json ./
RUN npm ci
COPY server/ ./
RUN npx prisma generate && npm run build

# Stage 3: runtime. prisma/, src/, and tsx stay in the image because the migration job runs
# `prisma migrate deploy` and the TypeScript seed from this same image.
FROM node:24-alpine AS production
WORKDIR /app/server
RUN apk add --no-cache openssl
COPY --from=server-builder /app/server/package*.json ./
COPY --from=server-builder /app/server/node_modules ./node_modules
COPY --from=server-builder /app/server/dist ./dist
COPY --from=server-builder /app/server/src ./src
COPY --from=server-builder /app/server/prisma ./prisma
COPY --from=server-builder /app/server/tsconfig.json ./tsconfig.json
COPY --from=server-builder /app/server/docker-entrypoint.sh ./docker-entrypoint.sh
COPY --from=client-builder /app/client/dist /app/client/dist
RUN chmod +x ./docker-entrypoint.sh

ENV NODE_ENV=production
ENV TZ=Asia/Bangkok
ENV PORT=3000
EXPOSE 3000
USER node
ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["node", "dist/index.js"]
