FROM node:20-bookworm-slim AS builder
WORKDIR /srv
COPY server/package.json server/package-lock.json* ./
RUN npm ci
COPY server/tsconfig.json ./
COPY server/src ./src
RUN npm run build

FROM node:20-bookworm-slim AS runner
ENV NODE_ENV=production
WORKDIR /srv
COPY server/package.json server/package-lock.json* ./
RUN npm ci --omit=dev
COPY --from=builder /srv/dist ./dist
# O volume de storage herda esta permissão na primeira criação.
RUN mkdir -p /data/storage && chown -R node:node /data
USER node
EXPOSE 4000
CMD ["node", "dist/index.js"]
