import uuid
from datetime import datetime, timezone
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from app.extensions import db
from app.models.utilisateur import Utilisateur
from app.models.livraison import Hub, ZoneLivraison, Livraison
from app.models.commande import Validation, Order, OrderStatus, Panier

livraisons_bp = Blueprint("livraisons", __name__)


# ----- Hubs -----

@livraisons_bp.route("/hubs", methods=["GET"])
def list_hubs():
    hubs = Hub.query.filter_by(actif=True).all()
    return jsonify([{
        "id": h.id, "nom": h.nom, "region": h.region, "ville": h.ville,
        "telephone": h.telephone, "contact": h.contact,
        "prix_par_km": str(h.prix_par_km), "prix_par_kg": str(h.prix_par_kg),
        "regions_servees": h.regions_servees,
        "mvola_number": h.mvola_number, "airtel_money_number": h.airtel_money_number,
        "orange_money_number": h.orange_money_number,
    } for h in hubs])


@livraisons_bp.route("/hubs", methods=["POST"])
@jwt_required()
def create_hub():
    claims = get_jwt()
    if claims.get("role") not in ("admin", "manager"):
        return jsonify({"error": "Accès non autorisé"}), 403
    data = request.get_json() or {}
    if not data.get("nom") or not data.get("region") or not data.get("ville"):
        return jsonify({"error": "nom, region, ville requis"}), 400

    hub = Hub(
        id=str(uuid.uuid4()),
        nom=data["nom"], region=data["region"], ville=data["ville"],
        adresse=data.get("adresse", ""), contact=data.get("contact", ""),
        telephone=data.get("telephone", ""),
        regions_servees=data.get("regions_servees", []),
        prix_par_km=data.get("prix_par_km", 0), prix_par_kg=data.get("prix_par_kg", 0),
    )
    db.session.add(hub)
    db.session.commit()
    return jsonify({"id": hub.id, "nom": hub.nom}), 201


# ----- Zones -----

@livraisons_bp.route("/zones", methods=["GET"])
def list_zones():
    hub_id = request.args.get("hub_id")
    query = ZoneLivraison.query.filter_by(actif=True)
    if hub_id:
        query = query.filter_by(hub_id=hub_id)
    zones = query.all()
    return jsonify([{
        "id": z.id, "hub_id": z.hub_id, "nom": z.nom, "ville": z.ville,
        "distance_km": str(z.distance_km) if z.distance_km else None,
        "delai_estime_jours": z.delai_estime_jours,
    } for z in zones])


# ----- Livraisons -----

@livraisons_bp.route("", methods=["GET"])
@jwt_required()
def list_livraisons():
    identity = get_jwt_identity()
    claims = get_jwt()
    role = claims.get("role", "")
    page = request.args.get("page", 1, type=int)
    per_page = request.args.get("per_page", 20, type=int)

    if role == "livreur":
        query = Livraison.query.filter_by(id_utilisateur=identity)
    elif role in ("admin", "manager"):
        query = Livraison.query
    else:
        return jsonify({"error": "Accès non autorisé"}), 403

    pagination = query.order_by(Livraison.date_creation.desc()).paginate(
        page=page, per_page=per_page, error_out=False
    )

    return jsonify({
        "livraisons": [_livraison_json(l) for l in pagination.items],
        "total": pagination.total, "page": pagination.page, "pages": pagination.pages,
    })


@livraisons_bp.route("/<livraison_id>/assign", methods=["PATCH"])
@jwt_required()
def assign_livreur(livraison_id):
    claims = get_jwt()
    if claims.get("role") not in ("admin", "manager"):
        return jsonify({"error": "Accès non autorisé"}), 403

    livraison = Livraison.query.get(livraison_id)
    if not livraison:
        return jsonify({"error": "Livraison introuvable"}), 404

    data = request.get_json() or {}
    livreur_id = data.get("livreur_id")
    if not livreur_id:
        return jsonify({"error": "livreur_id requis"}), 400

    livreur = db.session.get(Utilisateur, livreur_id)
    if not livreur or livreur.role != "livreur":
        return jsonify({"error": "Livreur invalide"}), 400

    livraison.id_utilisateur = livreur_id
    db.session.commit()
    return jsonify({"message": "Livreur assigné"})


@livraisons_bp.route("/<livraison_id>/deliver", methods=["PATCH"])
@jwt_required()
def mark_delivered(livraison_id):
    identity = get_jwt_identity()
    livraison = Livraison.query.get(livraison_id)
    if not livraison:
        return jsonify({"error": "Livraison introuvable"}), 404
    if livraison.id_utilisateur != identity:
        return jsonify({"error": "Non autorisé"}), 403

    livraison.date_reelle = datetime.now(timezone.utc)
    livraison.statut_paiement = "paye"
    db.session.commit()

    if livraison.validation:
        panier = Panier.query.get(livraison.validation.id_panier)
        if panier and panier.cart_session:
            order = Order.query.filter_by(id_utilisateur=panier.id_utilisateur).order_by(Order.date_creation.desc()).first()
            if order:
                order.transition_to(OrderStatus.DELIVERED)
                db.session.commit()

    return jsonify({"message": "Livraison marquée comme livrée"})


def _livraison_json(l):
    return {
        "id": l.id, "id_validation": l.id_validation,
        "livreur_id": l.id_utilisateur,
        "hub_source_id": l.hub_source_id, "hub_destination_id": l.hub_destination_id,
        "zone_livraison_id": l.zone_livraison_id,
        "date_prevue": l.date_prevue.isoformat() if l.date_prevue else None,
        "date_reelle": l.date_reelle.isoformat() if l.date_reelle else None,
        "montant_du": str(l.montant_du) if l.montant_du else "0",
        "montant_encaisse": str(l.montant_encaisse) if l.montant_encaisse else None,
        "statut_paiement": l.statut_paiement,
        "notes": l.notes,
    }
