import uuid
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from app.extensions import db
from app.models.utilisateur import Utilisateur, REGIONS_CHOICES

utilisateurs_bp = Blueprint("utilisateurs", __name__)


@utilisateurs_bp.route("", methods=["GET"])
@jwt_required()
def list_users():
    claims = get_jwt()
    role = claims.get("role", "")
    if role not in ("admin", "manager"):
        return jsonify({"error": "Accès non autorisé"}), 403

    page = request.args.get("page", 1, type=int)
    per_page = request.args.get("per_page", 20, type=int)
    role_filter = request.args.get("role")
    statut = request.args.get("statut")

    query = Utilisateur.query
    if role_filter:
        query = query.filter_by(role=role_filter)
    if statut:
        query = query.filter_by(statut=statut)

    pagination = query.order_by(Utilisateur.date_inscription.desc()).paginate(
        page=page, per_page=per_page, error_out=False
    )

    return jsonify({
        "users": [{
            "id": u.id, "email": u.email, "nom": u.nom, "prenom": u.prenom,
            "role": u.role, "telephone": u.telephone, "region": u.region,
            "statut": u.statut, "is_active": u.is_active,
            "date_inscription": u.date_inscription.isoformat() if u.date_inscription else None,
        } for u in pagination.items],
        "total": pagination.total,
        "page": pagination.page,
        "pages": pagination.pages,
    })


@utilisateurs_bp.route("/<user_id>", methods=["GET"])
@jwt_required()
def get_user(user_id):
    current_id = get_jwt_identity()
    claims = get_jwt()
    role = claims.get("role", "")

    if current_id != user_id and role not in ("admin", "manager"):
        return jsonify({"error": "Accès non autorisé"}), 403

    user = Utilisateur.query.get(user_id)
    if not user:
        return jsonify({"error": "Utilisateur introuvable"}), 404

    return jsonify({
        "id": user.id, "email": user.email, "nom": user.nom, "prenom": user.prenom,
        "role": user.role, "telephone": user.telephone, "region": user.region,
        "photo_de_profil": user.photo_de_profil, "description": user.description,
        "statut": user.statut, "is_active": user.is_active,
        "hub_id": user.hub_id, "quota_quotidien": user.quota_quotidien,
        "date_inscription": user.date_inscription.isoformat() if user.date_inscription else None,
    })


@utilisateurs_bp.route("/<user_id>", methods=["PUT"])
@jwt_required()
def update_user(user_id):
    current_id = get_jwt_identity()
    claims = get_jwt()
    role = claims.get("role", "")

    if current_id != user_id and role not in ("admin", "manager"):
        return jsonify({"error": "Accès non autorisé"}), 403

    user = Utilisateur.query.get(user_id)
    if not user:
        return jsonify({"error": "Utilisateur introuvable"}), 404

    data = request.get_json() or {}
    for field in ("nom", "prenom", "telephone", "region", "description", "photo_de_profil"):
        if field in data:
            setattr(user, field, data[field])

    if role == "admin":
        for field in ("role", "statut", "is_active", "hub_id", "quota_quotidien"):
            if field in data:
                setattr(user, field, data[field])

    db.session.commit()
    return jsonify({"message": "Profil mis à jour"})


@utilisateurs_bp.route("/artisans", methods=["GET"])
def list_artisans():
    artisans = Utilisateur.query.filter_by(role="artisan", statut="actif", is_active=True).all()
    return jsonify([{
        "id": u.id, "nom": u.nom, "prenom": u.prenom, "email": u.email,
        "telephone": u.telephone, "region": u.region, "description": u.description,
        "photo_de_profil": u.photo_de_profil,
    } for u in artisans])


@utilisateurs_bp.route("/livreurs", methods=["GET"])
@jwt_required()
def list_livreurs():
    claims = get_jwt()
    if claims.get("role") not in ("admin", "manager"):
        return jsonify({"error": "Accès non autorisé"}), 403

    livreurs = Utilisateur.query.filter_by(role="livreur").all()
    return jsonify([{
        "id": u.id, "nom": u.nom, "prenom": u.prenom, "email": u.email,
        "telephone": u.telephone, "region": u.region,
        "hub_id": u.hub_id, "quota_quotidien": u.quota_quotidien,
        "statut": u.statut, "is_active": u.is_active,
    } for u in livreurs])
