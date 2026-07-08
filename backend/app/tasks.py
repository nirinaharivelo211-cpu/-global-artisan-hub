from celery import Celery, shared_task
from app.config import Config
from datetime import datetime, timezone
from app.extensions import db
from app.models.commande import CartSession, Order, OrderStatus


def make_celery(app_name: str = __name__) -> Celery:
    celery = Celery(
        app_name,
        broker=Config.CELERY_BROKER_URL,
        backend=Config.CELERY_RESULT_BACKEND,
    )
    celery.conf.update(
        task_serializer="json",
        accept_content=["json"],
        result_serializer="json",
        timezone="Indian/Antananarivo",
        enable_utc=True,
        beat_schedule={
            "cleanup-expired-carts": {
                "task": "app.tasks.cleanup_expired_carts",
                "schedule": 86400,
            },
            "auto-cancel-unpaid-orders": {
                "task": "app.tasks.auto_cancel_unpaid_orders",
                "schedule": 3600,
            },
        },
    )
    return celery


@shared_task
def cleanup_expired_carts():
    cutoff = datetime.now(timezone.utc)
    expired = CartSession.query.filter(
        CartSession.statut == "active",
        CartSession.date_expiration.isnot(None),
        CartSession.date_expiration < cutoff,
    ).all()
    for s in expired:
        s.statut = "expired"
    db.session.commit()
    return f"Expired {len(expired)} cart(s)"


@shared_task
def auto_cancel_unpaid_orders():
    cutoff = datetime.now(timezone.utc)
    unpaid = Order.query.filter(
        Order.status == OrderStatus.AWAITING_PAYMENT,
        Order.date_creation < cutoff,
    ).all()
    for o in unpaid:
        try:
            o.transition_to(OrderStatus.CANCELLED)
        except ValueError:
            pass
    db.session.commit()
    return f"Cancelled {len(unpaid)} unpaid order(s)"


celery_app = make_celery()
