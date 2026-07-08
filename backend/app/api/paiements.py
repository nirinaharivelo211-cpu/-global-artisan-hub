import uuid
from datetime import datetime, timezone
from decimal import Decimal
from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from app.extensions import db
from app.models.commande import (
    PaymentTransaction, TransactionStatus, Validation, Facture, Order,
    OrderStatus, PaymentGateway, Panier,
)
from app.models.utilisateur import Utilisateur

paiements_bp = Blueprint("paiements", __name__)

import stripe
import requests
from functools import wraps


def optional_jwt(fn):
    @wraps(fn)
    @jwt_required(optional=True)
    def wrapper(*args, **kwargs):
        identity = get_jwt_identity()
        api_key = request.headers.get("X-API-Key", "")
        secret_key = current_app.config.get("INTERNAL_API_KEY", "")
        if not identity and api_key != secret_key:
            return jsonify({"error": "Authentification requise"}), 401
        return fn(*args, **kwargs)
    return wrapper


# ----- Stripe -----

@paiements_bp.route("/stripe/create-intent", methods=["POST"])
@optional_jwt
def create_stripe_intent():
    identity = get_jwt_identity()
    data = request.get_json() or {}
    order_id = data.get("order_id")
    montant = data.get("montant")
    devise = data.get("devise", "eur")

    if not order_id or not montant:
        return jsonify({"error": "order_id et montant requis"}), 400

    order = Order.query.get(order_id)
    if not order or order.id_utilisateur != identity:
        return jsonify({"error": "Commande introuvable"}), 404

    stripe.api_key = current_app.config["STRIPE_SECRET_KEY"]
    try:
        intent = stripe.PaymentIntent.create(
            amount=int(Decimal(str(montant)) * 100),
            currency=devise,
            metadata={"order_id": order_id, "user_id": identity},
        )
        tx = PaymentTransaction(
            id=str(uuid.uuid4()),
            validation_id=None,
            gateway=PaymentGateway.STRIPE,
            gateway_transaction_id=intent.id,
            montant=montant,
            devise=devise.upper(),
            statut=TransactionStatus.PENDING,
            gateway_response={"client_secret": intent.client_secret},
        )
        db.session.add(tx)
        db.session.commit()

        return jsonify({"client_secret": intent.client_secret, "transaction_id": tx.id})
    except stripe.error.StripeError as e:
        return jsonify({"error": str(e)}), 400


# ----- Flutterwave -----

@paiements_bp.route("/flutterwave/create", methods=["POST"])
@optional_jwt
def create_flutterwave_payment():
    identity = get_jwt_identity()
    data = request.get_json() or {}
    order_id = data.get("order_id")
    montant = data.get("montant")
    email = data.get("email")

    if not order_id or not montant:
        return jsonify({"error": "order_id et montant requis"}), 400

    order = Order.query.get(order_id)
    if not order or order.id_utilisateur != identity:
        return jsonify({"error": "Commande introuvable"}), 404

    secret_key = current_app.config["FLW_SECRET_KEY"]
    url = "https://api.flutterwave.com/v3/payments"

    payload = {
        "tx_ref": f"TIS-{order_id[:8]}-{int(datetime.now(timezone.utc).timestamp())}",
        "amount": str(montant),
        "currency": "MGA",
        "redirect_url": f"{current_app.config['FRONTEND_URL']}/checkout/success",
        "customer": {
            "email": email or "client@example.com",
            "name": "Client TISSAGE",
        },
        "meta": {"order_id": order_id},
        "customizations": {
            "title": "TISSAGE - Paiement",
            "description": f"Commande #{order_id[:8]}",
        },
    }

    try:
        resp = requests.post(
            url,
            headers={"Authorization": f"Bearer {secret_key}", "Content-Type": "application/json"},
            json=payload,
            timeout=30,
        )
        data = resp.json()
        if data.get("status") == "success":
            tx = PaymentTransaction(
                id=str(uuid.uuid4()),
                validation_id=None,
                gateway=PaymentGateway.FLUTTERWAVE,
                gateway_transaction_id=data["data"]["id"],
                montant=montant,
                devise="MGA",
                statut=TransactionStatus.PENDING,
                gateway_response=data,
            )
            db.session.add(tx)
            db.session.commit()
            return jsonify({"payment_link": data["data"]["link"], "transaction_id": tx.id})
        return jsonify({"error": data.get("message", "Erreur Flutterwave")}), 400
    except requests.RequestException as e:
        return jsonify({"error": str(e)}), 400


# ----- Transactions -----

@paiements_bp.route("/transactions", methods=["GET"])
@jwt_required()
def list_transactions():
    identity = get_jwt_identity()
    claims = get_jwt()
    page = request.args.get("page", 1, type=int)
    per_page = request.args.get("per_page", 20, type=int)

    role = claims.get("role", "")
    if role in ("admin", "manager"):
        query = PaymentTransaction.query
    else:
        panier_ids = [
            p.id for p in db.session.query(Panier.id).filter(
                Panier.id_utilisateur == identity
            ).all()
        ]
        valid_ids = [
            v.id for v in Validation.query.filter(Validation.id_panier.in_(panier_ids)).all()
        ]
        query = PaymentTransaction.query.filter(
            PaymentTransaction.validation_id.in_(valid_ids)
        )

    pagination = query.order_by(PaymentTransaction.date_creation.desc()).paginate(
        page=page, per_page=per_page, error_out=False
    )

    return jsonify({
        "transactions": [{
            "id": t.id, "gateway": t.gateway,
            "gateway_transaction_id": t.gateway_transaction_id,
            "montant": str(t.montant), "devise": t.devise,
            "statut": t.statut, "error_message": t.error_message,
            "date_creation": t.date_creation.isoformat() if t.date_creation else None,
        } for t in pagination.items],
        "total": pagination.total, "page": pagination.page, "pages": pagination.pages,
    })


@paiements_bp.route("/verify", methods=["POST"])
@jwt_required()
def verify_payment():
    data = request.get_json() or {}
    transaction_id = data.get("transaction_id")
    gateway = data.get("gateway")

    if not transaction_id:
        return jsonify({"error": "transaction_id requis"}), 400

    tx = PaymentTransaction.query.get(transaction_id)
    if not tx:
        return jsonify({"error": "Transaction introuvable"}), 404

    if gateway == "stripe":
        stripe.api_key = current_app.config["STRIPE_SECRET_KEY"]
        try:
            intent = stripe.PaymentIntent.retrieve(tx.gateway_transaction_id)
            if intent.status == "succeeded":
                tx.statut = TransactionStatus.SUCCESS
                db.session.commit()
                return jsonify({"statut": "success"})
            return jsonify({"statut": intent.status})
        except stripe.error.StripeError as e:
            return jsonify({"error": str(e)}), 400

    elif gateway == "flutterwave":
        secret_key = current_app.config["FLW_SECRET_KEY"]
        try:
            resp = requests.get(
                f"https://api.flutterwave.com/v3/transactions/{tx.gateway_transaction_id}/verify",
                headers={"Authorization": f"Bearer {secret_key}"},
                timeout=30,
            )
            data = resp.json()
            if data.get("status") == "success" and data["data"].get("status") == "successful":
                tx.statut = TransactionStatus.SUCCESS
                db.session.commit()
                return jsonify({"statut": "success"})
            return jsonify({"statut": data.get("data", {}).get("status", "unknown")})
        except requests.RequestException as e:
            return jsonify({"error": str(e)}), 400

    return jsonify({"error": "Passerelle non supportée"}), 400
