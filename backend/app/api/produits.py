import uuid
from datetime import datetime, timezone
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from app.extensions import db
from app.models.produit import Categorie, Produit, ProduitVariation, ProduitImage, Avis
from app.models.utilisateur import Utilisateur

produits_bp = Blueprint("produits", __name__)


@produits_bp.route("/categories", methods=["GET"])
def list_categories():
    categories = Categorie.query.all()
    return jsonify([{
        "id": c.id, "nom": c.nom, "description": c.description, "image": c.image,
    } for c in categories])


@produits_bp.route("/categories", methods=["POST"])
@jwt_required()
def create_categorie():
    claims = get_jwt()
    if claims.get("role") not in ("admin", "manager"):
        return jsonify({"error": "Accès non autorisé"}), 403
    data = request.get_json() or {}
    if not data.get("nom"):
        return jsonify({"error": "Nom requis"}), 400
    cat = Categorie(id=str(uuid.uuid4()), nom=data["nom"], description=data.get("description", ""))
    db.session.add(cat)
    db.session.commit()
    return jsonify({"id": cat.id, "nom": cat.nom}), 201


@produits_bp.route("", methods=["GET"])
def list_produits():
    page = request.args.get("page", 1, type=int)
    per_page = request.args.get("per_page", 20, type=int)
    categorie = request.args.get("categorie")
    artisan = request.args.get("artisan")
    search = request.args.get("search")

    query = Produit.query.filter_by(statut="publie")
    if categorie:
        query = query.filter_by(id_categorie=categorie)
    if artisan:
        query = query.filter_by(id_utilisateur=artisan)
    if search:
        query = query.filter(Produit.nom.ilike(f"%{search}%"))

    pagination = query.order_by(Produit.date_ajout.desc()).paginate(page=page, per_page=per_page, error_out=False)
    return jsonify({
        "produits": [_produit_json(p) for p in pagination.items],
        "total": pagination.total, "page": pagination.page, "pages": pagination.pages,
    })


@produits_bp.route("/<produit_id>", methods=["GET"])
def get_produit(produit_id):
    produit = Produit.query.get(produit_id)
    if not produit or produit.statut != "publie":
        return jsonify({"error": "Produit introuvable"}), 404
    return jsonify(_produit_json(produit))


@produits_bp.route("", methods=["POST"])
@jwt_required()
def create_produit():
    identity = get_jwt_identity()
    claims = get_jwt()
    user = Utilisateur.query.get(identity)
    if not user:
        return jsonify({"error": "Utilisateur introuvable"}), 404
    if user.role not in ("artisan", "admin"):
        return jsonify({"error": "Seuls les artisans peuvent créer des produits"}), 403

    data = request.get_json() or {}
    if not data.get("nom") or not data.get("prix") or not data.get("id_categorie"):
        return jsonify({"error": "Champs obligatoires : nom, prix, id_categorie"}), 400

    produit = Produit(
        id=str(uuid.uuid4()),
        id_utilisateur=identity,
        id_categorie=data["id_categorie"],
        nom=data["nom"],
        description=data.get("description", ""),
        prix=data["prix"],
        poids=data.get("poids"),
        image=data.get("image", ""),
    )
    db.session.add(produit)
    db.session.commit()
    return jsonify(_produit_json(produit)), 201


@produits_bp.route("/<produit_id>", methods=["PUT"])
@jwt_required()
def update_produit(produit_id):
    identity = get_jwt_identity()
    claims = get_jwt()
    produit = Produit.query.get(produit_id)
    if not produit:
        return jsonify({"error": "Produit introuvable"}), 404
    if produit.id_utilisateur != identity and claims.get("role") not in ("admin", "manager"):
        return jsonify({"error": "Non autorisé"}), 403

    data = request.get_json() or {}
    for field in ("nom", "description", "prix", "poids", "image", "statut", "id_categorie"):
        if field in data:
            setattr(produit, field, data[field])
    db.session.commit()
    return jsonify(_produit_json(produit))


@produits_bp.route("/<produit_id>/variations", methods=["GET"])
def list_variations(produit_id):
    variations = ProduitVariation.query.filter_by(produit_id=produit_id).all()
    return jsonify([{
        "id": v.id, "couleur": v.couleur, "couleur_nom": v.couleur_nom,
        "taille": v.taille, "type_mesure": v.type_mesure,
        "prix": str(v.prix), "stock": v.stock, "remise": str(v.remise) if v.remise else None,
        "poids": str(v.poids) if v.poids else None,
    } for v in variations])


@produits_bp.route("/<produit_id>/variations", methods=["POST"])
@jwt_required()
def create_variation(produit_id):
    identity = get_jwt_identity()
    produit = Produit.query.get(produit_id)
    if not produit:
        return jsonify({"error": "Produit introuvable"}), 404
    if produit.id_utilisateur != identity:
        return jsonify({"error": "Non autorisé"}), 403

    data = request.get_json() or {}
    variation = ProduitVariation(
        id=str(uuid.uuid4()),
        produit_id=produit_id,
        couleur=data.get("couleur"),
        couleur_nom=data.get("couleur_nom"),
        taille=data.get("taille"),
        type_mesure=data.get("type_mesure"),
        prix=data["prix"],
        stock=data.get("stock", 0),
        remise=data.get("remise"),
    )
    db.session.add(variation)
    db.session.commit()
    return jsonify({"id": variation.id, "message": "Variation créée"}), 201


@produits_bp.route("/<produit_id>/avis", methods=["GET"])
def list_avis(produit_id):
    avis = Avis.query.filter_by(id_produit=produit_id).order_by(Avis.date_avis.desc()).all()
    return jsonify([{
        "id": a.id, "note": a.note, "commentaire": a.commentaire,
        "date_avis": a.date_avis.isoformat() if a.date_avis else None,
    } for a in avis])


@produits_bp.route("/<produit_id>/avis", methods=["POST"])
@jwt_required()
def create_avis(produit_id):
    identity = get_jwt_identity()
    user = Utilisateur.query.get(identity)
    if not user or user.role != "client":
        return jsonify({"error": "Seuls les clients peuvent donner un avis"}), 403

    data = request.get_json() or {}
    note = data.get("note")
    if not note or note < 1 or note > 5:
        return jsonify({"error": "Note entre 1 et 5"}), 400

    existing = Avis.query.filter_by(id_utilisateur=identity, id_produit=produit_id).first()
    if existing:
        return jsonify({"error": "Vous avez déjà donné un avis sur ce produit"}), 409

    avis = Avis(
        id=str(uuid.uuid4()),
        id_utilisateur=identity,
        id_produit=produit_id,
        note=note,
        commentaire=data.get("commentaire", ""),
    )
    db.session.add(avis)
    db.session.commit()
    return jsonify({"message": "Avis créé"}), 201


def _produit_json(p):
    return {
        "id": p.id, "nom": p.nom, "description": p.description,
        "prix": str(p.prix), "poids": str(p.poids) if p.poids else None,
        "image": p.image, "statut": p.statut,
        "id_categorie": p.id_categorie, "id_utilisateur": p.id_utilisateur,
        "date_ajout": p.date_ajout.isoformat() if p.date_ajout else None,
        "variations": [{
            "id": v.id, "couleur": v.couleur, "couleur_nom": v.couleur_nom,
            "taille": v.taille, "prix": str(v.prix), "stock": v.stock,
        } for v in p.variations],
    }
