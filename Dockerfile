FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM deps AS build
WORKDIR /app
COPY . .
RUN npm run build

FROM node:20-alpine AS api
WORKDIR /app
ENV NODE_ENV=production
COPY --chown=node:node package.json package-lock.json ./
RUN npm ci --omit=dev
COPY --chown=node:node server ./server
USER node
HEALTHCHECK --interval=30s --timeout=5s --retries=3 CMD node -e "fetch('http://localhost:'+(process.env.PORT||8787)+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
EXPOSE 8787
CMD ["node", "server/api.mjs"]

FROM nginx:alpine AS web
COPY --from=build /app/dist /usr/share/nginx/html
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
