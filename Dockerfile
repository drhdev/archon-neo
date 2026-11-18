# syntax=docker/dockerfile:1
# Archon NEO – static site served by an unprivileged nginx (non-root, port 8080).
FROM nginxinc/nginx-unprivileged:1.28-alpine

LABEL org.opencontainers.image.title="Archon NEO" \
      org.opencontainers.image.description="A modern fan tribute to the 1983 classic Archon – strategy plus real-time arena duels in the browser." \
      org.opencontainers.image.source="https://github.com/drhdev/archon-neo" \
      org.opencontainers.image.licenses="GPL-3.0-only"

# Remove the nginx demo pages.
USER root
RUN rm -rf /usr/share/nginx/html/* && chown 101:101 /usr/share/nginx/html
USER 101

COPY nginx/default.conf /etc/nginx/conf.d/default.conf
COPY nginx/security-headers.conf /etc/nginx/security-headers.conf
COPY --chmod=755 docker/40-site-url.sh /docker-entrypoint.d/40-site-url.sh
# Owned by the nginx user so the entrypoint can inject the public URL at start-up.
COPY --chown=101:101 public/ /usr/share/nginx/html/

EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -q --spider http://127.0.0.1:8080/healthz || exit 1
