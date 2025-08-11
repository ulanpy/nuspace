from celery import Celery

from backend.core.configs.config import config

celery_app = Celery(
    main="worker",
    broker=config.CELERY_BROKER_URL,
    include=["backend.celery_app.tasks"],
    broker_connection_retry_on_startup=True,  # Important for Docker compatibility
)

celery_app.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    timezone="UTC",
    enable_utc=True,
    worker_send_task_events=True,
    task_ignore_result=True,  # We don't need results for kick tasks
    task_acks_late=True,  # Better for reliability. Means worker ACK broker only when done executing
    task_reject_on_worker_lost=True,
    task_track_started=True,
    broker_connection_retry_on_startup=True,
    worker_prefetch_multiplier=1,  # Better for fairness  gives prefetch_count=1 to RMQ
    task_soft_time_limit=30,  # 30 seconds timeout
    task_default_queue="default",
    task_routes={"backend.celery_app.tasks.schedule_kick": {"queue": "kick_queue"}},
)
