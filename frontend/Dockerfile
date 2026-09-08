FROM node:22-alpine AS build

WORKDIR /workspace
RUN corepack enable && corepack prepare pnpm@11.22.0 --activate
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY frontend/package.json ./frontend/package.json
RUN pnpm install --frozen-lockfile
COPY frontend ./frontend
COPY backend ./backend
COPY .env.example ./.env.example
ENV BACKEND_URL=http://backend:8000
RUN pnpm frontend:build

FROM node:22-alpine AS runtime

WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system app && adduser --system --ingroup app app
COPY --from=build /workspace/node_modules ./node_modules
COPY --from=build /workspace/frontend/.next ./frontend/.next
COPY --from=build /workspace/frontend/public ./frontend/public
COPY --from=build /workspace/frontend/package.json ./frontend/package.json
COPY --from=build /workspace/package.json ./package.json
RUN chown -R app:app /app
USER app
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:3000/ || exit 1

CMD ["node", "node_modules/next/dist/bin/next", "start", "frontend"]
