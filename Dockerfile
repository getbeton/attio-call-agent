FROM node:24-slim
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund
COPY src ./src
COPY prompts ./prompts
ENV NODE_ENV=production DATA_DIR=/data NODE_NO_WARNINGS=1
CMD ["node", "src/main.ts", "serve"]
