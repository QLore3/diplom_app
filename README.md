# diplom_app

Статическая страница дипломного DevOps-стенда на nginx: интерактивная схема инфраструктуры, путь релиза, версия сборки и танцующий котик.

```bash
docker build --build-arg APP_VERSION=v1.0.0 --build-arg VCS_REF="$(git rev-parse HEAD)" -t diplom_app:local .
docker run --rm -p 8080:8080 --read-only --tmpfs /tmp --cap-drop ALL --security-opt no-new-privileges diplom_app:local
```

Открыть `http://localhost:8080`. Контейнер работает от пользователя nginx на порту 8080. `/healthz` — проверка доступности, `/version.json` — версия, коммит и время сборки. Внешние библиотеки и шрифты не нужны.

Образ публикуется workflow в `ghcr.io/qlore3/diplom_app` с тегами `latest` и `sha-<коммит>`. Деплой в Kubernetes будет настроен на следующем этапе.
