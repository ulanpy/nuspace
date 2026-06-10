# Database backups (WAL-G + pg_dump)

Краткий справочник по бэкапам PostgreSQL на production/staging. Читать с нуля при инциденте или если «бэкапы не работают».

## Зачем два слоя

| Слой | Инструмент | Назначение |
|------|------------|------------|
| Physical + PITR | WAL-G | Минимальная потеря данных, откат до точки во времени (миграция, `down -v` на volume) |
| Logical fallback | pg_dump | Если physical битый, другая major-версия PG, выборочный restore |

Оба пишут **off-site** в GCS. Локальный docker volume `postgres-data` **не** является бэкапом.

## Архитектура

```
                    ┌──────────────────────────────────────┐
  Backend ─────────►│  postgres (kamikadze24/postgres-walg)  │
                    │  volume: postgres-data               │
                    │                                      │
                    │  archive_command (непрерывно):       │
                    │    wal-g wal-push %p ────────────────┼──► GCS
                    └──────────────────┬───────────────────┘    wal-g/main/
                                       │ :5432
                    ┌──────────────────▼───────────────────┐
                    │  backup (kamikadze24/nuspace-backup)     │
                    │  supercronic (расписание в crontab)  │
                    │                                      │
                    │  04:00 UTC  → wal-g backup-push ─────┼──► GCS wal-g/main/
                    │  */6 h      → pg_dump + upload ──────┼──► GCS pg-dump/...
                    └──────────────────────────────────────┘

GCS auth: VM service account через metadata server
          (extra_hosts: metadata.google.internal → 169.254.169.254)
```

### Кто что делает

| Контейнер | Операция | Когда |
|-----------|----------|-------|
| `postgres` | `wal-g wal-push` | Постоянно, на каждый готовый WAL-сегмент (~16 MB, `archive_timeout=1h`) |
| `backup` | `wal-g backup-push` | Ежедневно **04:00 UTC** |
| `backup` | `pg_dump` → GCS | Каждые **6 часов** (00:00, 06:00, 12:00, 18:00 UTC) |

`wal-push` вызывается **внутри** postgres (shell `archive_command`).  
`backup-push` и `pg_dump` — из sidecar по сети `postgres:5432`.

## GCS bucket

Один bucket на окружение, два префикса:

| Окружение | Bucket (Terraform) |
|-----------|-------------------|
| Production | `nuspace-backups-prod` |
| Staging | `nuspace-backups-staging` |

Регион: `europe-central2` (рядом с VM).

```
gs://nuspace-backups-prod/
├── wal-g/main/                          ← WAL-G (WAL + base backups)
│   ├── wal_...                          ← WAL segments (wal-push)
│   └── basebackups_...                  ← base backups (backup-push)
└── pg-dump/postgres/<DB_NAME>/          ← логические дампы
    └── 2026-06-10T12-00-00Z.dump.gz
```

Terraform: `terraform/backups.tf`, переменная `backups_bucket_name` в `terraform/envs/*.tfvars`.

## Retention (политики хранения)

| Политика | Значение | Где задано |
|----------|----------|------------|
| Lifecycle delete | **30 дней** | `terraform/backups.tf` → `lifecycle_rule.age = 30` |
| GCS soft delete | **7 дней** | `soft_delete_policy.retention_duration_seconds = 604800` |
| WAL-G full chain | Управляется WAL-G + lifecycle bucket | Старые объекты удаляются GCS lifecycle |

Отдельного retention в WAL-G cron нет — полагаемся на lifecycle bucket (30d).

## Конфигурация

### Переменные `.env` на VM

На VM `.env` подтягивается из **Google Secret Manager** (`nuspace-env`, Ansible `roles/secrets`).  
Добавь в секрет **до деплоя**:

```bash
BACKUPS_BUCKET_NAME=nuspace-backups-prod   # staging: nuspace-backups-staging
DB_USER=...
DB_PASSWORD=...
DB_NAME=...
```

Также нужен `terraform apply` для bucket и IAM VM SA.

Compose подставляет:
- `WALG_GS_PREFIX=gs://${BACKUPS_BUCKET_NAME}/wal-g/main` — postgres + backup
- `BACKUPS_BUCKET_NAME` — backup sidecar (pg_dump upload)

### PostgreSQL (через `command` в compose)

```
wal_level=replica
archive_mode=on
archive_command=wal-g wal-push %p
archive_timeout=3600
```

Включение `wal_level=replica` требует **restart** postgres при первом деплое.

### WAL-G

- Версия: **v3.0.8** (см. `infra/postgres/Dockerfile`, `infra/backup/Dockerfile`)
- Storage: `WALG_GS_PREFIX` (префикс в GCS)
- Credentials: ADC через metadata VM SA (`nuspace-vm-sa@...`)

### Расписание sidecar

Планировщик: **supercronic** внутри контейнера `backup` (не cron на хосте).  
Расписание: `infra/backup/crontab`.

| Задача | Когда (UTC) | Скрипт |
|--------|-------------|--------|
| WAL-G base backup | каждый день в **04:00** | `walg-backup-push.sh` |
| pg_dump | каждые **6 часов** (00:00, 06:00, 12:00, 18:00) | `pg-dump-backup.sh` |

### IAM

- VM SA: `roles/storage.objectAdmin` на backup bucket (`terraform/backups.tf`)
- Плюс project-level `storage.admin` на VM SA (уже было)

## Деплой / обновление

Образы собираются на **GitHub Actions runner** и пушатся в Docker Hub (как fastapi):

| Образ | Docker Hub |
|-------|------------|
| Postgres + WAL-G | `kamikadze24/postgres-walg:latest` |
| Backup sidecar | `kamikadze24/nuspace-backup:latest` |

CI билдит при изменении `infra/prod.docker-compose.yml`, `infra/postgres/**` или `infra/backup/**`.  
VM только `docker compose pull` — см. `ansible/roles/infra_services`.

```bash
# Локальная сборка (опционально)
cd infra
TAG=latest docker compose -f build.docker-compose.yaml build postgres backup

# На VM после деплоя
docker compose -f prod.docker-compose.yml pull postgres backup
docker compose -f prod.docker-compose.yml up -d postgres backup
```

## Проверка что бэкапы живы

```bash
# Логи sidecar
docker logs backup --tail 100

# WAL-G: список base backups в GCS
docker exec backup wal-g backup-list

# pg_dump в GCS
gcloud storage ls gs://nuspace-backups-prod/pg-dump/postgres/

# Postgres archiving (ошибки archive_command)
docker logs postgres 2>&1 | grep -i archive

# Ручной прогон
docker exec backup /scripts/walg-backup-push.sh
docker exec backup /scripts/pg-dump-backup.sh
```

Успешный `pg_dump` пишет в лог: `pg_dump backup uploaded to gs://...`.

## Восстановление

> Делать на **отдельной** recovery VM или после остановки fastapi. Не экспериментировать на prod без понимания downtime.

### Вариант A — pg_dump (проще)

```bash
# Скачать дамп
gcloud storage cp gs://nuspace-backups-prod/pg-dump/postgres/postgres/<TIMESTAMP>.dump.gz /tmp/

docker compose -f prod.docker-compose.yml stop fastapi

gunzip -c /tmp/<TIMESTAMP>.dump.gz > /tmp/restore.dump

# Пересоздать БД (ОСТОРОЖНО: уничтожает текущие данные)
docker compose -f prod.docker-compose.yml exec -T postgres \
  psql -U postgres -c "DROP DATABASE postgres WITH (FORCE);"
docker compose -f prod.docker-compose.yml exec -T postgres \
  psql -U postgres -c "CREATE DATABASE postgres;"

docker compose -f prod.docker-compose.yml exec -T postgres \
  pg_restore -U postgres -d postgres --no-owner --no-acl < /tmp/restore.dump

docker compose -f prod.docker-compose.yml start fastapi
```

### Вариант B — WAL-G (PITR)

См. официальную документацию WAL-G: [PostgreSQL backups](https://github.com/wal-g/wal-g#postgresql).

Общая схема:

1. Остановить postgres, очистить `postgres-data` (или новый volume)
2. `wal-g backup-fetch <BACKUP_NAME> /var/lib/postgresql/data`
3. Создать `recovery.conf` / signal file с `recovery_target_time` (PG17: через `postgresql.auto.conf`)
4. Запустить postgres в recovery mode
5. После recovery — promote

Команды выполнять в контейнере с `wal-g` и доступом к volume + `WALG_GS_PREFIX`.

Для PITR нужны **и** base backup (`backup-push`), **и** непрерывный WAL (`wal-push`).

## Troubleshooting

| Симптом | Вероятная причина | Что проверить |
|---------|-------------------|---------------|
| Нет новых файлов в `pg-dump/` | Sidecar упал, нет env, GCS auth | `docker logs backup`, `BACKUPS_BUCKET_NAME` в `.env` |
| Нет `wal-g/main/` в GCS | `archive_command` падает | `docker logs postgres`, metadata доступен из контейнера |
| `backup-push` failed | Нет PGDATA mount, remote mode без replication в pg_hba | `docker exec backup wal-g backup-push /var/lib/postgresql/data` |
| Бэкапы есть, но старые | Lifecycle 30d | `gcloud storage ls` с датами |
| После `down -v` пустая БД | Volume удалён локально | Восстановление **только из GCS**, не с диска |
| Диск VM полон | WAL копятся локально при сбое archive | `docker exec postgres du -sh /var/lib/postgresql/data/pg_wal` |

### Metadata / GCS auth из контейнера

```bash
docker exec backup curl -s -H "Metadata-Flavor: Google" \
  http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/email
```

Должен вернуть email VM SA.

## Что НЕ бэкапится этой системой

- `redis-data`, `rabbitmq-data`, `grafana-data`, `prometheus_data`, `loki_data` — отдельные docker volumes
- Медиафайлы — bucket `nuspace-media` (отдельно)
- Снапшоты boot-диска VM — **ещё не настроены** (планируется отдельно)

## Файлы в репозитории

```
infra/
├── postgres/Dockerfile          # postgres:17 + wal-g
├── backup/
│   ├── Dockerfile               # sidecar: wal-g, pg_dump, supercronic
│   ├── crontab                  # расписание
│   ├── scripts/
│   │   ├── common.sh
│   │   ├── walg-backup-push.sh
│   │   └── pg-dump-backup.sh
│   └── README.md                # этот файл
└── prod.docker-compose.yml      # сервисы postgres + backup

terraform/backups.tf             # GCS bucket + IAM
```

## История решения

Система внедрена после инцидента 2025-06-09: `docker compose down -v` удалил `postgres-data`. Keycloak-сессии пережили wipe, локальная БД — нет. Off-site бэкапы в GCS закрывают этот класс потерь.
