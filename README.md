# Дипломное приложение: от коммита до кластера

Статическая страница на nginx: интерактивная схема инфраструктуры, путь релиза, версия сборки и танцующий котик. Собственный Dockerfile; внешние JavaScript-библиотеки и шрифты не используются.

- [Открыть приложение](http://51.250.69.86/)
- [Инфраструктура, Kubernetes и мониторинг](https://github.com/QLore3/diplom_stand)
- [Публичный пакет GHCR](https://github.com/QLore3/diplom_app/pkgs/container/diplom_app): `ghcr.io/qlore3/diplom_app:v1.0.0`.
- [Сборки и деплои](https://github.com/QLore3/diplom_app/actions/workflows/publish.yml)

## Локальный запуск

```bash
docker build --build-arg APP_VERSION=v1.0.0 --build-arg VCS_REF="$(git rev-parse HEAD)" -t diplom_app:local .
docker run --rm -p 8080:8080 --read-only --tmpfs /tmp:rw,noexec,nosuid,size=16m \
  --cap-drop ALL --security-opt no-new-privileges --memory 32m diplom_app:local
```

Открыть `http://localhost:8080`. Контейнер работает от пользователя nginx (UID 101), порт 8080; корневая файловая система доступна только для чтения, временные файлы находятся в `/tmp`. Базовый nginx закреплён по digest в Dockerfile.

| URL | Назначение |
|---|---|
| `/` | Страница проекта |
| `/healthz` | HTTP 200 и `ok` для probes |
| `/version.json` | Версия, Git revision и время сборки |
| `/assets/dancing-cat.gif` | Исходная GIF пользователя |

## CI/CD

Workflow [publish.yml](.github/workflows/publish.yml) запускается при push в любую ветку, push тега `v*` и вручную.

1. Собирает образ с `APP_VERSION` и `VCS_REF`, OCI labels версии и коммита.
2. Запускает контейнер без root с read-only rootfs, ограничением памяти и без capabilities; проверяет nginx, HTTP, GIF и метаданные версии.
3. Публикует `ghcr.io/qlore3/diplom_app:sha-<полный SHA>`; для `main` также `latest`.
4. Для тега `vX.Y.Z` (поддерживается `vX.Y.Z-rc.1`) публикует соответствующий image tag и обновляет Kubernetes Deployment по **digest**.
5. Ожидает rollout и проверяет публичные health/version/commit. При ошибке восстанавливает предыдущий digest; job остаётся неуспешным. Деплои сериализованы.

Выпуск новой версии:

```bash
git add public
git commit -m "update application"
git push origin main
# После успешной сборки выбрать новый свободный номер версии.
git tag v1.0.1
git push origin v1.0.1
```

Для повторного развёртывания существующей версии после восстановления кластера:

```bash
gh workflow run publish.yml --repo QLore3/diplom_app --ref v1.0.0
```

Repository Secrets: `WIREGUARD_CONFIG`, `DELIVERY_KUBECONFIG`; Variable: `PUBLIC_APP_URL`. Публикация использует встроенный `GITHUB_TOKEN` с `packages: write`. Секреты создаются/обновляются владельцем по инструкции репозитория стенда, в Git их нет.

GitHub-hosted runner подключается по WireGuard к control plane, доступен только Kubernetes API. Клиентская учётная запись может обновлять только Deployment `app/diplom-app`; ей не передаются cluster-admin или облачные credentials. Сертификат действует 30 дней, обновление выполняется через `ansible/delivery.yml` в репозитории стенда и повторную загрузку `DELIVERY_KUBECONFIG`.

## Развёртывание и проверка

Kubernetes-манифесты находятся в [diplom_stand/kubernetes/app](https://github.com/QLore3/diplom_stand/tree/main/kubernetes/app). Две реплики распределены по разным workers, RollingUpdate сохраняет одну доступную реплику. Настроены probes, requests/limits, read-only rootfs и Pod Security Restricted. Повторный Ansible сохраняет образ, выпущенный через CI/CD.

[Успешный запуск после пересоздания кластера](https://github.com/QLore3/diplom_app/actions/runs/42178255099).

Проверены реальный релиз `v1.0.0`, публикация образа, обновление страницы, восстановление после пересоздания кластера и откат при недоступном образе. HTTP доступен на порту 80; текущее состояние показывают `/healthz`, `/version.json` и версия на странице.
