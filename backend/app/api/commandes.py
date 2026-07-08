import uuid
from datetime import datetime, timezone
from decimal import Decimal
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from app.extensions import db
from app.models.commande import (
    Order, OrderItem, OrderStatus, PaymentMethod, ShippingAddress,
    CartSession, Panier, Validation, Facture, Colis, ColisStatus,
    ReversementArtisan, DemandePaiement, PaymentTransaction, TransactionStatus,
)
from app.models.utilisateur import Utilisateur
from app.models.produit import Produit, ProduitVariation
from app.utils import normalize_city, determine_payment_method_by_city

commandes_bp = Blueprint("commandes", __name__)


# ----- Cart -----

@commandes_bp.route("/cart", methods=["GET"])
@jwt_required()
def get_cart():
    identity = get_jwt_identity()
    session = CartSession.query.filter_by(id_utilisateur=identity, statut="active").first()
    if not session:
        return jsonify({"items": [], "total": "0"})
    items = []
    total = Decimal("0")
    for item in session.items:
        items.append({
            "id": item.id, "produit_id": item.id_produit, "nom": item.produit.nom if item.produit else "",
            "image": item.produit.image if item.produit else "",
            "prix_unitaire": str(item.prix_unitaire),
            "quantite": item.quantite,
            "variation_id": item.produit_variation_id,
        })
        total += Decimal(str(item.prix_unitaire)) * item.quantite
    return jsonify({"items": items, "total": str(total), "session_id": session.id})


@commandes_bp.route("/cart/add", methods=["POST"])
@jwt_required()
def add_to_cart():
    identity = get_jwt_identity()
    data = request.get_json() or {}
    produit_id = data.get("produit_id")
    variation_id = data.get("variation_id")
    quantite = data.get("quantite", 1)

    if not produit_id:
        return jsonify({"error": "produit_id requis"}), 400

    produit = Produit.query.get(produit_id)
    if not produit or produit.statut != "publie":
        return jsonify({"error": "Produit introuvable"}), 404

    session = CartSession.query.filter_by(id_utilisateur=identity, statut="active").first()
    if not session:
        session = CartSession(id=str(uuid.uuid4()), id_utilisateur=identity)
        db.session.add(session)
        db.session.flush()

    existing = Panier.query.filter_by(
        cart_session_id=session.id, id_produit=produit_id,
        produit_variation_id=variation_id,
    ).first()
    if existing:
        existing.quantite += quantite
    else:
        item = Panier(
            id=str(uuid.uuid4()),
            cart_session_id=session.id, id_utilisateur=identity,
            id_produit=produit_id, produit_variation_id=variation_id,
            quantite=quantite, prix_unitaire=data.get("prix_unitaire", produit.prix),
        )
        db.session.add(item)

    db.session.commit()
    return jsonify({"message": "Ajouté au panier"})


@commandes_bp.route("/cart/remove/<item_id>", methods=["DELETE"])
@jwt_required()
def remove_from_cart(item_id):
    identity = get_jwt_identity()
    item = Panier.query.get(item_id)
    if not item or item.id_utilisateur != identity:
        return jsonify({"error": "Élément introuvable"}), 404
    db.session.delete(item)
    db.session.commit()
    return jsonify({"message": "Retiré du panier"})


# ----- Orders -----

@commandes_bp.route("/orders", methods=["GET"])
@jwt_required()
def list_orders():
    identity = get_jwt_identity()
    claims = get_jwt()
    page = request.args.get("page", 1, type=int)
    per_page = request.args.get("per_page", 20, type=int)

    if claims.get("role") in ("admin", "manager"):
        query = Order.query
    else:
        query = Order.query.filter_by(id_utilisateur=identity)

    status_filter = request.args.get("status")
    if status_filter:
        query = query.filter_by(status=status_filter)

    pagination = query.order_by(Order.date_creation.desc()).paginate(
        page=page, per_page=per_page, error_out=False
    )

    return jsonify({
        "orders": [_order_json(o) for o in pagination.items],
        "total": pagination.total, "page": pagination.page, "pages": pagination.pages,
    })


@commandes_bp.route("/orders/<order_id>", methods=["GET"])
@jwt_required()
def get_order(order_id):
    identity = get_jwt_identity()
    claims = get_jwt()
    order = Order.query.get(order_id)
    if not order:
        return jsonify({"error": "Commande introuvable"}), 404
    if order.id_utilisateur != identity and claims.get("role") not in ("admin", "manager", "artisan"):
        return jsonify({"error": "Non autorisé"}), 403
    return jsonify(_order_json(order))


@commandes_bp.route("/checkout", methods=["POST"])
@jwt_required()
def checkout():
    identity = get_jwt_identity()
    user = Utilisateur.query.get(identity)
    if not user or user.role != "client":
        return jsonify({"error": "Accès client requis"}), 403

    session = CartSession.query.filter_by(id_utilisateur=identity, statut="active").first()
    if not session or not session.items:
        return jsonify({"error": "Panier vide"}), 400

    data = request.get_json() or {}
    address = data.get("address", "")
    city = data.get("city", "")
    region = data.get("region", "")

    if not address or not city:
        return jsonify({"error": "Adresse de livraison requise"}), 400

    normalized_city = normalize_city(city)
    payment_method = data.get("payment_method") or determine_payment_method_by_city(normalized_city)

    subtotal = sum(Decimal(str(i.prix_unitaire)) * i.quantite for i in session.items)
    frais = Decimal(str(data.get("frais_livraison", 0)))
    total = subtotal + frais

    shipping = ShippingAddress(
        id=str(uuid.uuid4()),
        address=address,
        city=city,
        region=region,
    )
    db.session.add(shipping)
    db.session.flush()

    order = Order(
        id=str(uuid.uuid4()),
        id_utilisateur=identity,
        shipping_address_id=shipping.id,
        status=OrderStatus.PENDING,
        payment_method=payment_method,
        montant_total=total,
        frais_livraison=frais,
        notes=data.get("notes", ""),
    )
    db.session.add(order)
    db.session.flush()

    line_total = Decimal("0")
    for cart_item in session.items:
        order_item = OrderItem(
            id=str(uuid.uuid4()),
            order_id=order.id,
            id_produit=cart_item.id_produit,
            produit_variation_id=cart_item.produit_variation_id,
            quantite=cart_item.quantite,
            prix_unitaire=cart_item.prix_unitaire,
        )
        db.session.add(order_item)
        line_total += Decimal(str(cart_item.prix_unitaire)) * cart_item.quantite

    session.statut = "converted"
    db.session.commit()

    return jsonify({"order_id": order.id, "montant_total": str(total), "status": order.status}), 201


@commandes_bp.route("/orders/<order_id>/status", methods=["PATCH"])
@jwt_required()
def update_order_status(order_id):
    claims = get_jwt()
    if claims.get("role") not in ("admin", "manager", "artisan"):
        return jsonify({"error": "Non autorisé"}), 403

    order = Order.query.get(order_id)
    if not order:
        return jsonify({"error": "Commande introuvable"}), 404

    data = request.get_json() or {}
    new_status = data.get("status")
    if not new_status:
        return jsonify({"error": "Status requis"}), 400

    try:
        order.transition_to(new_status)
        db.session.commit()
        return jsonify({"message": f"Statut mis à jour: {new_status}", "status": order.status})
    except ValueError as e:
        return jsonify({"error": str(e)}), 400


def _order_json(o):
    return {
        "id": o.id, "id_utilisateur": o.id_utilisateur,
        "status": o.status, "payment_method": o.payment_method,
        "montant_total": str(o.montant_total),
        "frais_livraison": str(o.frais_livraison),
        "notes": o.notes,
        "date_creation": o.date_creation.isoformat() if o.date_creation else None,
        "date_confirmation": o.date_confirmation.isoformat() if o.date_confirmation else None,
        "items": [{
            "id": i.id, "produit_id": i.id_produit,
            "quantite": i.quantite, "prix_unitaire": str(i.prix_unitaire),
            "total": str(Decimal(str(i.prix_unitaire)) * i.quantite),
        } for i in o.items],
    }
