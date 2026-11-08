FROM node:24-slim
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund
COPY src ./src
COPY prompts ./prompts
# CLAUDE_CONFIG_DIR: Claude Code keeps its session files on the volume, so a restart does not resend the history
ENV NODE_ENV=production DATA_DIR=/data NODE_NO_WARNINGS=1 CLAUDE_CONFIG_DIR=/data/claude
CMD ["node", "src/main.ts", "serve"]
