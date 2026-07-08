from datetime import datetime, timezone
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from app.extensions import db
from app.models.notification import Notification

notifications_bp = Blueprint("notifications", __name__)


@notifications_bp.route("", methods=["GET"])
@jwt_required()
def list_notifications():
    identity = get_jwt_identity()
    page = request.args.get("page", 1, type=int)
    per_page = request.args.get("per_page", 20, type=int)
    unread_only = request.args.get("unread_only", "false").lower() == "true"

    query = Notification.query.filter_by(id_utilisateur=identity)
    if unread_only:
        query = query.filter_by(est_lu=False)

    pagination = query.order_by(Notification.date_creation.desc()).paginate(
        page=page, per_page=per_page, error_out=False
    )

    return jsonify({
        "notifications": [{
            "id": n.id, "categorie": n.categorie, "type_notif": n.type_notif,
            "titre": n.titre, "message": n.message, "lien": n.lien,
            "icone": n.icone, "couleur": n.couleur,
            "est_lu": n.est_lu,
            "date_creation": n.date_creation.isoformat() if n.date_creation else None,
        } for n in pagination.items],
        "total": pagination.total,
        "page": pagination.page,
        "pages": pagination.pages,
        "unread_count": Notification.query.filter_by(id_utilisateur=identity, est_lu=False).count(),
    })


@notifications_bp.route("/<notif_id>/read", methods=["PATCH"])
@jwt_required()
def mark_read(notif_id):
    identity = get_jwt_identity()
    notif = Notification.query.get(notif_id)
    if not notif or notif.id_utilisateur != identity:
        return jsonify({"error": "Notification introuvable"}), 404
    notif.mark_as_read()
    db.session.commit()
    return jsonify({"message": "Marquée comme lue"})


@notifications_bp.route("/read-all", methods=["PATCH"])
@jwt_required()
def mark_all_read():
    identity = get_jwt_identity()
    now = datetime.now(timezone.utc)
    Notification.query.filter_by(id_utilisateur=identity, est_lu=False).update(
        {"est_lu": True, "date_lecture": now}
    )
    db.session.commit()
    return jsonify({"message": "Toutes marquées comme lues"})


@notifications_bp.route("/<notif_id>", methods=["DELETE"])
@jwt_required()
def delete_notification(notif_id):
    identity = get_jwt_identity()
    notif = Notification.query.get(notif_id)
    if not notif or notif.id_utilisateur != identity:
        return jsonify({"error": "Notification introuvable"}), 404
    db.session.delete(notif)
    db.session.commit()
    return jsonify({"message": "Notification supprimée"})
