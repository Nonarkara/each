# EACH — product tier.
# Builds the app and serves it together with the account service on one origin,
# so a startup can sign up, keep its workspace, and come back from any device.
FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:24-alpine AS run
WORKDIR /app
ENV NODE_ENV=production \
    EACH_PORT=8080 \
    EACH_DB_PATH=/data/each.sqlite \
    EACH_STATIC_DIR=/app/dist
COPY --from=build /app/dist ./dist
COPY server ./server
RUN mkdir -p /data
VOLUME ["/data"]
EXPOSE 8080
# node:sqlite keeps the workspace in a single file; no database server to run.
CMD ["node", "server/index.mjs"]
