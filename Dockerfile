FROM nginx:stable-alpine@sha256:0e52bd054126cdc040b1276c0af347aeb02a41b9cfe305d6094767ac30e97949

ARG APP_VERSION=dev
ARG VCS_REF=local

LABEL org.opencontainers.image.title="diplom_app" \
      org.opencontainers.image.description="DevOps diploma application with a dancing cat" \
      org.opencontainers.image.source="https://github.com/QLore3/diplom_app" \
      org.opencontainers.image.version="${APP_VERSION}" \
      org.opencontainers.image.revision="${VCS_REF}"

COPY nginx.conf /etc/nginx/nginx.conf
COPY --chown=nginx:nginx public/ /srv/www/

RUN printf '%s' "$APP_VERSION" | grep -Eq '^[A-Za-z0-9][A-Za-z0-9._+-]{0,100}$' \
    && printf '%s' "$VCS_REF" | grep -Eq '^(local|[0-9a-f]{7,40})$' \
    && printf '{"version":"%s","revision":"%s","built_at":"%s"}\n' \
       "$APP_VERSION" "$VCS_REF" "$(date -u +%Y-%m-%dT%H:%M:%SZ)" > /srv/www/version.json

USER nginx
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget -q -O /dev/null http://127.0.0.1:8080/healthz || exit 1
ENTRYPOINT ["nginx"]
CMD ["-g", "daemon off;"]
