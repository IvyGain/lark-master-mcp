FROM node:22-slim AS deps
WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev --no-audit --no-fund

FROM node:22-slim AS build
WORKDIR /app
COPY package.json ./
RUN npm install --no-audit --no-fund
COPY tsconfig.json ./
COPY src ./src
RUN npx tsc -p tsconfig.json

FROM node:22-slim AS runtime
WORKDIR /app

# Install lark-cli globally (runtime dependency — the brain spawns it per tool call)
RUN npm install -g @larksuite/cli @larksuiteoapi/lark-mcp --no-audit --no-fund \
    && npm cache clean --force

# Copy app
COPY --from=deps /app/node_modules /app/node_modules
COPY --from=build /app/dist /app/dist
COPY package.json /app/package.json

ENV NODE_ENV=production \
    PORT=8787 \
    LARK_CLI_BIN=lark-cli

EXPOSE 8787

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://localhost:'+process.env.PORT+'/healthz').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "dist/server.js"]
