import stripe
from flask import Blueprint, request, jsonify, current_app
from app.extensions import db
from app.models.commande import PaymentTransaction, TransactionStatus

stripe_webhook_bp = Blueprint("stripe_webhook", __name__)


@stripe_webhook_bp.route("/stripe", methods=["POST"])
def stripe_webhook():
    payload = request.get_data()
    sig_header = request.headers.get("Stripe-Signature")
    endpoint_secret = current_app.config["STRIPE_WEBHOOK_SECRET"]

    if not endpoint_secret:
        return jsonify({"error": "Webhook secret not configured"}), 500

    try:
        event = stripe.Webhook.construct_event(payload, sig_header, endpoint_secret)
    except (ValueError, stripe.error.SignatureVerificationError) as e:
        return jsonify({"error": str(e)}), 400

    event_type = event.get("type")
    data = event.get("data", {}).get("object", {})

    if event_type == "payment_intent.succeeded":
        transaction_id = data.get("id")
        tx = PaymentTransaction.query.filter_by(
            gateway="stripe", gateway_transaction_id=transaction_id
        ).first()
        if tx:
            tx.statut = TransactionStatus.SUCCESS
            tx.gateway_response = data
            db.session.commit()

    elif event_type == "payment_intent.payment_failed":
        transaction_id = data.get("id")
        tx = PaymentTransaction.query.filter_by(
            gateway="stripe", gateway_transaction_id=transaction_id
        ).first()
        if tx:
            tx.statut = TransactionStatus.FAILED
            tx.error_message = data.get("last_payment_error", {}).get("message", "")
            tx.gateway_response = data
            db.session.commit()

    elif event_type == "payment_intent.canceled":
        transaction_id = data.get("id")
        tx = PaymentTransaction.query.filter_by(
            gateway="stripe", gateway_transaction_id=transaction_id
        ).first()
        if tx:
            tx.statut = TransactionStatus.CANCELLED
            tx.gateway_response = data
            db.session.commit()

    return jsonify({"received": True}), 200
