# CONSTRUI-TE: una sola URL publica (frontend + API)
FROM node:22-bookworm-slim AS frontend-build
WORKDIR /frontend
COPY frontend/construite-frontend/package*.json ./
RUN npm install --no-audit --no-fund
COPY frontend/construite-frontend/ ./
ARG VITE_API_URL=
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

FROM node:22-bookworm-slim AS production
WORKDIR /app
ENV NODE_ENV=production
COPY backend/construite-backend/package*.json ./
RUN npm install --omit=dev --no-audit --no-fund
COPY backend/construite-backend/prisma ./prisma
COPY backend/construite-backend/src ./src
COPY backend/construite-backend/tests ./tests
COPY --from=frontend-build /frontend/dist ./public
RUN npx prisma generate
EXPOSE 4000
CMD ["sh", "-c", "npx prisma db push --accept-data-loss && node prisma/seed.js && node src/server.js"]
