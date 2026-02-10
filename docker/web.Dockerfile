FROM node:20-bookworm-slim

WORKDIR /app
ENV NODE_ENV=development
ENV NEXT_TELEMETRY_DISABLED=1

COPY package.json package-lock.json ./
COPY apps ./apps
COPY packages ./packages

RUN npm ci

EXPOSE 3000
CMD ["npm", "--workspace", "apps/web", "run", "dev", "--", "--hostname", "0.0.0.0", "--port", "3000"]
