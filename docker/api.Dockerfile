FROM node:20-bookworm-slim

WORKDIR /app
ENV NODE_ENV=development

RUN apt-get update -y \
  && apt-get install -y --no-install-recommends openssl netcat-openbsd \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
COPY apps ./apps
COPY packages ./packages

RUN npm ci

WORKDIR /app/apps/api
RUN npm run prisma:generate

COPY docker/api-entrypoint.sh /usr/local/bin/api-entrypoint.sh
RUN chmod +x /usr/local/bin/api-entrypoint.sh

EXPOSE 4000
ENTRYPOINT ["/usr/local/bin/api-entrypoint.sh"]
CMD ["npm", "run", "start:dev"]
