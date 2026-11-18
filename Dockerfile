# Glühlabor: App und Server in einem Container (Node 22, SQLite eingebaut).
FROM node:22-slim AS bau
WORKDIR /bau
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# "/" = die App spricht mit dem Server unter derselben Adresse
ENV VITE_API_URL=/
RUN npm run build && npm run build:server

FROM node:22-slim
ENV NODE_ENV=production DATA_DIR=/data PORT=8787 APP_ROOT=/app NODE_NO_WARNINGS=1
WORKDIR /app
COPY --from=bau /bau/dist ./dist
COPY --from=bau /bau/dist-server ./dist-server
COPY --from=bau /bau/worker/migrations ./worker/migrations
COPY --from=bau /bau/data/gluehwein-2025.csv ./data/gluehwein-2025.csv
RUN mkdir -p /data && chown node:node /data
USER node
EXPOSE 8787
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s CMD node -e "fetch('http://127.0.0.1:8787/api/status').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "dist-server/index.mjs"]
