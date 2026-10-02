FROM node:24-bookworm-slim AS build
WORKDIR /app
ENV NUXT_TELEMETRY_DISABLED=1
COPY package.json package-lock.json ./
# Source is not present yet; postinstall's Nuxt preparation runs in the next step.
RUN npm ci --ignore-scripts
COPY . .
RUN npm run build

FROM node:24-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production HOST=0.0.0.0 PORT=3000
COPY --from=build --chown=node:node /app/.output ./.output
COPY --from=build --chown=node:node /app/database ./database
COPY --from=build --chown=node:node /app/scripts/migrate.mjs ./scripts/migrate.mjs
# The pre-deploy migration needs only the pure JS PostgreSQL driver.
COPY --from=build --chown=node:node /app/node_modules/postgres ./node_modules/postgres
USER node
EXPOSE 3000
CMD ["node", ".output/server/index.mjs"]
