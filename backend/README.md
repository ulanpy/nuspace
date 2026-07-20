# Backend: архитектура и правила

Документ описывает, как устроен бэкенд и как писать новый код так, чтобы каждый сервис работал как **модуль** с чёткими слоями.

---

## Где что лежит

- **Модули** — `backend/modules/<module_name>/` (например `sgotinish/tickets`, `sgotinish/delegation`, `auth`, `courses`). ORM-модели модуля живут в `models.py` / `models/` рядом с доменом (не в `core`).
- **Общая инфраструктура** — `backend/core/` (`Base`, `AsyncDatabaseManager`, `model_registry`), `backend/common/` (deps, DTO, утилиты).
- **Bootstrap** — `backend/bootstrap/` (startup клиентов: DB, Redis, GCS, Meilisearch, Rabbit). Доменная регистрация (индексы, bot, schedule sync) живёт в модулях и собирается в `lifespan.py`.
- **Роутеры** подключаются в `backend/modules/routers.py` (из `lifespan.py`).

Канонические пути моделей:

| Владелец | Путь |
|----------|------|
| Identity | `modules/auth/models.py` (`User`, роли) |
| Media | `modules/media/models.py` (`Media`, `EntityType`) |
| Notification | `modules/notification/models.py` |
| Campus Current | `modules/campuscurrent/models/` |
| Courses | `modules/courses/models/` |
| SGotinish | `modules/sgotinish/models.py` |
| Opportunities | `modules/opportunities/models.py` |

В `core/database/models/` только `Base`. Alembic и DB manager вызывают `import_models()` из `core/database/model_registry.py`, чтобы зарегистрировать все таблицы на `Base.metadata`.
---

## Модуль = bounded context

Каждый модуль — это отдельный кусок продукта со своими:

- **API** (HTTP-эндпоинты)
- **Бизнес-логикой** (сервис)
- **Доступом к данным** (репозиторий)
- **Схемами запросов/ответов** (DTO)
- **Зависимостями** (инжект сессии, пользователя, репо, сервиса)

Модули не лезут в репозитории и сервисы друг друга напрямую. Кросс-модульные вызовы — через `interfaces.py` (ролевые `typing.Protocol`) в **вызывающем** модуле и DI реализации в `dependencies.py`. Общие DTO — в `common`. ORM-модели — в своём модуле (`models.py` / `models/`); чужие модели другим модулям не импортировать (только через порт).

---

## Слои внутри модуля

Рекомендуемая структура файлов и ответственность:

| Слой           | Файл           | Ответственность |
|----------------|----------------|------------------|
| **API**        | `api.py`       | Роутер FastAPI, валидация входа (тело/query), вызов сервиса, возврат ответа. Никакой бизнес-логики и SQL. |
| **Сервис**     | `service.py`   | Сценарии использования, проверки прав (policy), оркестрация репозиториев и внешних вызовов. Не знает про HTTP. |
| **Репозиторий**| `repository.py`| Работа с БД: выборки, вставки, обновления. Только SQLAlchemy 2.0, без кастомных QueryBuilder. |
| **Модели**     | `models.py` / `models/` | SQLAlchemy ORM сущности модуля. Наследуют `Base` из `core.database.models.base`. После добавления — зарегистрировать импорт в `core/database/model_registry.py`. |
| **Схемы**      | `schemas.py`   | Pydantic-модели: DTO создания/обновления, ответы, фильтры. |
| **Зависимости**| `dependencies.py` | FastAPI `Depends`: получение сессии, текущего пользователя, инстансов репо/сервиса. |

Дополнительно по необходимости:

- `policy.py` — проверки прав (используются из сервиса).
- `interfaces.py` — `typing.Protocol`: контракт (порт) на зависимость из другого модуля. Описывает **вызывающий** модуль (дублирование между модулями допустимо). Реализация подставляется в `dependencies.py`. Имена портов — **ролевые**, не совпадают с классами сервисов (см. правило 5).
- `search_indexes.py` — декларация Meilisearch-индексов модуля: список `MEILISEARCH_INDEXES` (`MeilisearchIndexConfig` из `bootstrap/meilisearch.py`). Сборка и sync — в `lifespan.py`, не в модуле.
- `startup.py` — lifecycle-хуки модуля на старте/остановке процесса (`setup_*` / `cleanup_*`): фоновые задачи, периодический sync, wiring адаптеров (например bot, registrar schedule). Вызываются из `lifespan.py` после поднятия инфра-клиентов в `bootstrap/`.

Поток данных: **API → Service → Repository → DB**. Зависимости инжектятся в API (сервис, репо, пользователь), сервис получает репо и прочие зависимости через конструктор или аргументы.

---

## Правила

1. **Нет SQL в зависимостях**  
   В `dependencies.py` — только получение сессии, пользователя, создание репо/сервиса. Загрузка сущностей по id и валидация — в сервисе (или репозитории по вызову из сервиса).

2. **Политика в сервисе**  
   Проверки «может ли пользователь сделать X» делаются в сервисе (или в отдельном policy-модуле, вызываемом из сервиса), а не в контроллерах.

3. **Репозиторий — только данные**  
   Нативный SQLAlchemy 2.0: `select()`, `where()`, `options(selectinload(...))`, `execute()`, `scalars().first()` / `scalars().all()`, `add`/`flush`/`refresh`. Без обёрток типа QueryBuilder.

4. **Транзакции: в репозитории не коммитим**  
   Граница транзакции (commit/rollback) — снаружи модуля: сессия инжектируется из dependency, по завершении запроса делается один `commit` (или `rollback` при ошибке). В репозитории только: `add()`/`add_all()` для новых записей, `flush()` когда нужны ID или согласованность с БД внутри запроса, `refresh()` чтобы подтянуть данные после flush. Коммит в репо не вызываем — иначе несколько операций в одном сценарии дадут несколько roundtrip’ов и потеряют атомарность.

5. **Модули не лезут в репозитории и сервисы друг друга**  
   Кросс-модульные вызовы — через `interfaces.py` (`Protocol`) в **вызывающем** модуле и DI реализации (обычно сервис соседнего модуля) в `dependencies.py`. Используй `Protocol`, не ABC.

   **Именование портов (`interfaces.py`):**
   - Имя описывает **роль для вызывающего модуля**, а не класс провайдера. Не копируй имя сервиса (`MediaService`, `RegistrarService` и т.п.).
   - Префикс `I` (`IMediaService`) в Python не используем.
   - Суффикс `Port` опционален; предпочтительны ролевые имена: `MediaAttachmentResolver`, `TicketAccessChecker`, `CalendarEventSync`, `CourseCatalogLookup`.
   - Один и тот же порт может дублироваться в разных модулях, если каждому нужен свой срез API.
   - Конкретная реализация живёт только в `dependencies.py`; в `service.py` — аннотации на порт.

   Примеры:

   | Модуль-вызывающий | Порт | Реализация в `dependencies.py` |
   |-------------------|------|--------------------------------|
   | `events` | `MediaAttachmentResolver` | `media.service.MediaService` |
   | `messages` | `TicketAccessChecker` | `tickets.service.TicketService` |
   | `courses` | `StudentScheduleRegistrar` | `registrar.service.RegistrarService` |

6. **Модули не зависят от HTTP друг друга**  
   Общая логика — через сервисы по контракту или общие схемы, а не через внутренние HTTP-вызовы между модулями.

7. **При ответе не мутировать загруженные ORM-объекты**  
   Сессия по запросу в конце делает один `commit`. Любое присвоение полю загруженной сущности (например, `ticket.status = x`) помечает её как изменённую и это уйдёт в БД. Для данных «только для отображения» (подсчёты, права, доп. поля): строить DTO из сущности (`model_validate(entity)` или аналог), затем менять уже **DTO**, а не entity. Изменения ORM — только в сценариях явного обновления (с последующим flush в репо).

---

## Как добавить новый модуль

1. Создать папку `backend/modules/<name>/`.
2. Добавить файлы:
   - `api.py` — роутер и эндпоинты;
   - `service.py` — сценарии;
   - `repository.py` — запросы к БД;
   - `models.py` — ORM (при своих таблицах); добавить импорт в `core/database/model_registry.py`;
   - `schemas.py` — DTO;
   - `dependencies.py` — `Depends` для сессии, пользователя, репо, сервиса;
   - `interfaces.py` — при необходимости: `Protocol` для зависимостей из других модулей.
3. В `api.py` использовать зависимости для инжекта сервиса/репо, в хендлерах вызывать только методы сервиса.
4. Подключить роутер в `backend/modules/routers.py` в список `routers`.

Пример минимального потока: запрос → `api` (Depends) → `service.method()` → `repository` → БД → ответ из сервиса в DTO в `api`.

---

## Пример эталонного модуля

По слоям можно ориентироваться на:

- `backend/modules/sgotinish/tickets` — api, service, repository, schemas, dependencies, policy.
- `backend/modules/sgotinish/delegation` — тот же набор без policy, репозиторий уже на нативном SQLAlchemy.

Детали по конкретным фичам (анонимность, делегирование и т.д.) — в `backend/modules/sgotinish/README.md`.
