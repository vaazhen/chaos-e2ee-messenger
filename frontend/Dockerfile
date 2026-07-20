FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts --no-audit --no-fund
COPY . .
RUN npm run lint && npm test -- --run && npm run build

FROM nginx:1.27-alpine
RUN apk upgrade --no-cache && \
    rm -f /etc/nginx/conf.d/default.conf && \
    mkdir -p /var/cache/nginx /var/run /tmp && \
    chown -R nginx:nginx /var/cache/nginx /var/run /tmp /usr/share/nginx/html
COPY --from=build --chown=nginx:nginx /app/dist /usr/share/nginx/html
COPY --chown=nginx:nginx nginx.conf /etc/nginx/conf.d/default.conf
USER nginx
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s --retries=3 CMD wget -qO- http://127.0.0.1:8080/healthz || exit 1
CMD ["nginx", "-g", "daemon off;"]
