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
                    │  backup (kamikadze24/nuspace-backup) │
                    │  volume: postgres-data (ro)         │
                    │  supercronic v0.2.46 + crontab      │
                    │                                      │
                    │  04:00 UTC  → backup-push (PGDATA) ──┼──► GCS wal-g/main/
                    │  */6 h      → pg_dump → postgres ────┼──► GCS pg-dump/...
                    └──────────────────────────────────────┘

GCS auth: VM service account через metadata server
          (extra_hosts: metadata.google.internal → 169.254.169.254)
```

### Кто что делает

| Контейнер | Операция | Когда |
|-----------|----------|-------|
| `postgres` | `wal-g wal-push` | Постоянно, на каждый готовый WAL-сегмент (~16 MB, `archive_timeout=1h`) |
| `backup` | `wal-g backup-push $PGDATA` | Ежедневно **04:00 UTC** (читает volume `postgres-data` локально) |
| `backup` | `pg_dump` → GCS | Каждые **6 часов** (00:00, 06:00, 12:00, 18:00 UTC), подключение к `postgres:5432` |

`wal-push` вызывается **внутри** postgres (`archive_command`).  
`backup-push` — из sidecar по **смонтированному PGDATA** (+ TCP к postgres для `pg_start_backup`).  
`pg_dump` — из sidecar по сети `postgres:5432`.

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
│   ├── wal_005/                         ← WAL segments (wal-push), файлы *.lz4
│   └── basebackups_005/                 ← base backups (backup-push)
└── pg-dump/postgres/<DB_NAME>/          ← логические дампы (prod: nuspace)
    └── 2026-06-10T12-00-00Z.dump.gz
```

WAL-G сжимает данные алгоритмом **LZ4** (расширение `.lz4` в GCS — не класс storage, а compression).

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

### Sidecar `backup`

- Базовый образ: `postgres:17-bookworm` (bash, `pg_dump`, `pg_isready`)
- `init: true` в compose (docker-init как PID 1)
- Планировщик: **supercronic v0.2.46+** (`/usr/local/bin/supercronic`; v0.2.33 ломается как PID 1)
- Volume: `postgres-data:/var/lib/postgresql/data:ro` + `PGDATA` для `backup-push`
- Скрипты экспортируют libpq: `PGUSER`, `PGDATABASE`, `PGPASSWORD` из `DB_*` (`scripts/common.sh`)

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

# pg_dump в GCS (<DB_NAME> — значение DB_NAME из .env, на prod: nuspace)
gcloud storage ls gs://nuspace-backups-prod/pg-dump/postgres/<DB_NAME>/

# WAL-сегменты и base backups
gcloud storage ls gs://nuspace-backups-prod/wal-g/main/wal_005/
gcloud storage ls gs://nuspace-backups-prod/wal-g/main/basebackups_005/

# Postgres archiving (ошибки archive_command)
docker logs postgres 2>&1 | grep -i archive

# Ручной прогон (через скрипты — выставляют PGUSER и PGDATA)
docker exec backup /bin/bash /scripts/walg-backup-push.sh
docker exec backup /bin/bash /scripts/pg-dump-backup.sh
```

Успешный `pg_dump` пишет в лог: `pg_dump backup uploaded to gs://...`.  
Успешный `backup-push` пишет: `Wrote backup with name base_...` и `WAL-G backup-push completed`.

> Не запускай `wal-g backup-push` напрямую без скрипта — без `PGUSER` wal-g попытается войти как `root`.

## Восстановление

> Делать на **отдельной** recovery VM или после остановки fastapi. Не экспериментировать на prod без понимания downtime.

### Вариант A — pg_dump (проще)

Точность: до момента создания дампа (не до секунды, как PITR).

```bash
# Скачать дамп (<DB_NAME> — из .env, на prod: nuspace)
gcloud storage cp \
  gs://nuspace-backups-prod/pg-dump/postgres/<DB_NAME>/<TIMESTAMP>.dump.gz /tmp/

docker compose -f prod.docker-compose.yml stop fastapi

gunzip -c /tmp/<TIMESTAMP>.dump.gz > /tmp/restore.dump

# Пересоздать БД (ОСТОРОЖНО: уничтожает текущие данные; <DB_USER>/<DB_NAME> — из .env)
docker compose -f prod.docker-compose.yml exec -T postgres \
  psql -U <DB_USER> -c "DROP DATABASE \"<DB_NAME>\" WITH (FORCE);"
docker compose -f prod.docker-compose.yml exec -T postgres \
  psql -U <DB_USER> -c "CREATE DATABASE \"<DB_NAME>\";"

docker compose -f prod.docker-compose.yml exec -T postgres \
  pg_restore -U <DB_USER> -d <DB_NAME> --no-owner --no-acl < /tmp/restore.dump

docker compose -f prod.docker-compose.yml start fastapi
```

### Вариант B — WAL-G (PITR)

См. [WAL-G PostgreSQL](https://github.com/wal-g/wal-g/blob/master/docs/PostgreSQL.md).

Нужны **оба** слоя: base backup (`backup-push`) **и** WAL после него (`wal-push` в `wal_005/`).

Postgres накатывает WAL сам: для каждого сегмента вызывает `restore_command` → `wal-g wal-fetch` тянет файл из GCS.  
Остановиться можно **не только в конце цепочки** — задай `recovery_target_time`, `recovery_target_lsn` или `recovery_target_name` в `postgresql.auto.conf`.

```bash
# 1. Имя backup из backup-list
docker exec backup wal-g backup-list
# пример: base_000000010000000000000008

# 2. Остановить зависимые сервисы и postgres
docker compose -f prod.docker-compose.yml stop fastapi backup
docker compose -f prod.docker-compose.yml stop postgres

# 3. Очистить PGDATA (ОСТОРОЖНО) или поднять на отдельной recovery VM
#    Команды ниже — внутри контейнера postgres или backup с volume + WALG_GS_PREFIX

wal-g backup-fetch base_000000010000000000000008 /var/lib/postgresql/data

touch /var/lib/postgresql/data/recovery.signal
cat >> /var/lib/postgresql/data/postgresql.auto.conf <<'EOF'
restore_command = 'wal-g wal-fetch "%f" "%p"'
recovery_target_time = '2026-06-11 08:30:00+00'
recovery_target_action = 'promote'
EOF

# 4. Запустить postgres — recovery mode, накат WAL до recovery_target_time
docker compose -f prod.docker-compose.yml start postgres
docker logs -f postgres   # ждать consistent recovery / promote

# 5. Проверить и поднять приложение
docker compose -f prod.docker-compose.yml start fastapi backup
```

Без `recovery_target_*` Postgres накатит **все** доступные WAL из GCS (максимально свежее состояние).

## Troubleshooting

| Симптом | Вероятная причина | Что проверить |
|---------|-------------------|---------------|
| Нет новых файлов в `pg-dump/` | Sidecar упал, нет env, GCS auth | `docker logs backup`, `BACKUPS_BUCKET_NAME` в `.env` |
| Нет `wal-g/main/` в GCS | `archive_command` падает | `docker logs postgres`, metadata доступен из контейнера |
| `backup-push` failed | Нет PGDATA mount → remote mode без replication в pg_hba | `docker exec backup ls /var/lib/postgresql/data/PG_VERSION`; затем `/bin/bash /scripts/walg-backup-push.sh` |
| `user=root` при wal-g | Запуск wal-g без скрипта (нет PGUSER) | Только через `/bin/bash /scripts/walg-backup-push.sh` |
| backup Restarting, `Failed to fork exec` | supercronic v0.2.33 как PID 1 | Образ с v0.2.46+ и CMD `/usr/local/bin/supercronic` |
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
│   ├── Dockerfile               # postgres:17-bookworm + wal-g, pg_dump, supercronic
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

Система внедрена после инцидента 2026-06-09: `docker compose down -v` удалил `postgres-data`. Keycloak-сессии пережили wipe, локальная БД — нет. Off-site бэкапы в GCS закрывают этот класс потерь.
