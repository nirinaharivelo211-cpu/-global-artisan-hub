from datetime import datetime, timedelta, timezone
import uuid
from flask import Blueprint, request, jsonify
from flask_jwt_extended import (
    create_access_token, create_refresh_token, jwt_required, get_jwt_identity,
)
from app.extensions import db
from app.models.utilisateur import Utilisateur, ROLE_CHOICES
from app.models.notification import Notification

auth_bp = Blueprint("auth", __name__)


@auth_bp.route("/register", methods=["POST"])
def register():
    data = request.get_json() or {}
    email = data.get("email", "").strip().lower()
    password = data.get("password", "")
    nom = data.get("nom", "").strip()
    prenom = data.get("prenom", "").strip()
    role = data.get("role", "client")

    if not email or not password or not nom or not prenom:
        return jsonify({"error": "Champs obligatoires : email, password, nom, prenom"}), 400
    if len(password) < 6:
        return jsonify({"error": "Mot de passe trop court (min 6 caractères)"}), 400
    if role not in ROLE_CHOICES:
        return jsonify({"error": f"Rôle invalide. Choisir parmi {ROLE_CHOICES}"}), 400
    if Utilisateur.query.filter_by(email=email).first():
        return jsonify({"error": "Un compte avec cet email existe déjà"}), 409

    user = Utilisateur(id=str(uuid.uuid4()), email=email, nom=nom, prenom=prenom, role=role)
    user.set_password(password)
    db.session.add(user)
    db.session.flush()

    notif = Notification(
        id_utilisateur=user.id,
        categorie="systeme",
        type_notif="nouvelle_inscription",
        titre="Bienvenue sur TISSAGE",
        message=f"Votre compte {role} a été créé avec succès.",
    )
    db.session.add(notif)
    db.session.commit()

    token = create_access_token(identity=user.id, additional_claims={"role": user.role})
    refresh = create_refresh_token(identity=user.id)

    return jsonify({
        "token": token,
        "refresh_token": refresh,
        "user": {
            "id": user.id, "email": user.email, "nom": user.nom,
            "prenom": user.prenom, "role": user.role,
        },
    }), 201


@auth_bp.route("/login", methods=["POST"])
def login():
    data = request.get_json() or {}
    email = data.get("email", "").strip().lower()
    password = data.get("password", "")

    if not email or not password:
        return jsonify({"error": "Email et mot de passe requis"}), 400

    user = Utilisateur.query.filter_by(email=email).first()
    if not user or not user.check_password(password):
        return jsonify({"error": "Email ou mot de passe incorrect"}), 401
    if not user.is_active or user.statut != "actif":
        return jsonify({"error": "Compte désactivé ou suspendu"}), 403

    token = create_access_token(identity=user.id, additional_claims={"role": user.role})
    refresh = create_refresh_token(identity=user.id)

    return jsonify({
        "token": token,
        "refresh_token": refresh,
        "user": {
            "id": user.id, "email": user.email, "nom": user.nom,
            "prenom": user.prenom, "role": user.role, "telephone": user.telephone,
            "region": user.region, "photo_de_profil": user.photo_de_profil,
            "description": user.description,
        },
    })


@auth_bp.route("/refresh", methods=["POST"])
@jwt_required(refresh=True)
def refresh():
    identity = get_jwt_identity()
    user = Utilisateur.query.get(identity)
    if not user:
        return jsonify({"error": "Utilisateur introuvable"}), 404
    token = create_access_token(identity=user.id, additional_claims={"role": user.role})
    return jsonify({"token": token})


@auth_bp.route("/me", methods=["GET"])
@jwt_required()
def me():
    identity = get_jwt_identity()
    user = Utilisateur.query.get(identity)
    if not user:
        return jsonify({"error": "Utilisateur introuvable"}), 404
    return jsonify({
        "id": user.id, "email": user.email, "nom": user.nom,
        "prenom": user.prenom, "role": user.role, "telephone": user.telephone,
        "region": user.region, "photo_de_profil": user.photo_de_profil,
        "description": user.description, "statut": user.statut,
        "is_staff": user.is_staff, "date_inscription": user.date_inscription.isoformat() if user.date_inscription else None,
    })
