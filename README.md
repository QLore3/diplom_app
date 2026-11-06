# diplom_app

Статическая страница дипломного DevOps-стенда на nginx: интерактивная схема инфраструктуры, путь релиза, версия сборки и танцующий котик.

```bash
docker build --build-arg APP_VERSION=v1.0.0 --build-arg VCS_REF="$(git rev-parse HEAD)" -t diplom_app:local .
docker run --rm -p 8080:8080 --read-only --tmpfs /tmp --cap-drop ALL --security-opt no-new-privileges diplom_app:local
```

Открыть `http://localhost:8080`. Контейнер работает от пользователя nginx на порту 8080. `/healthz` — проверка доступности, `/version.json` — версия, коммит и время сборки. Внешние библиотеки и шрифты не нужны.

GitHub Actions собирает, проверяет и публикует образ `ghcr.io/qlore3/diplom_app:sha-<коммит>` при каждом push в любую ветку. Для `main` обновляется `latest`.

Push тега `v1.0.0` (или `v1.0.0-rc.1`) публикует одноимённый тег образа и автоматически обновляет приложение в Kubernetes по digest. Workflow ожидает завершения rollout и проверяет `/healthz` и `/version.json`; при ошибке возвращает предыдущий образ. Деплои выполняются последовательно.

Доступ runner к Kubernetes API проходит через WireGuard. Repository Secrets: `WIREGUARD_CONFIG` и `DELIVERY_KUBECONFIG`; Variable: `PUBLIC_APP_URL`. Учётная запись может обновлять только Deployment `app/diplom-app`; облачные ключи и cluster-admin ей не передаются. Настройка доступа — `ansible/delivery.yml` в репозитории стенда.

Приложение: http://51.250.73.107/.
