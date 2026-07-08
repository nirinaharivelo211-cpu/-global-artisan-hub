from flask import Blueprint, request, jsonify, current_app
from app.extensions import db
from app.models.commande import PaymentTransaction, TransactionStatus

flutterwave_webhook_bp = Blueprint("flutterwave_webhook", __name__)


@flutterwave_webhook_bp.route("/flutterwave", methods=["POST"])
def flutterwave_webhook():
    payload = request.get_data(as_text=True)
    signature = request.headers.get("verif-hash", "")

    secret_hash = current_app.config.get("FLW_WEBHOOK_SECRET", "")
    if secret_hash and signature != secret_hash:
        return jsonify({"error": "Invalid signature"}), 400

    try:
        data = request.get_json() or {}
    except Exception:
        return jsonify({"error": "Invalid JSON"}), 400

    event_type = data.get("event")
    event_data = data.get("data", {})

    if event_type == "charge.completed":
        transaction_id = event_data.get("id")
        status = event_data.get("status")

        tx = PaymentTransaction.query.filter_by(
            gateway="flutterwave", gateway_transaction_id=str(transaction_id)
        ).first()

        if tx:
            if status == "successful":
                tx.statut = TransactionStatus.SUCCESS
            else:
                tx.statut = TransactionStatus.FAILED
                tx.error_message = event_data.get("processor_response", "")
            tx.gateway_response = data
            db.session.commit()

    elif event_type == "charge.failed":
        transaction_id = event_data.get("id")
        tx = PaymentTransaction.query.filter_by(
            gateway="flutterwave", gateway_transaction_id=str(transaction_id)
        ).first()
        if tx:
            tx.statut = TransactionStatus.FAILED
            tx.error_message = event_data.get("processor_response", "")
            tx.gateway_response = data
            db.session.commit()

    return jsonify({"received": True}), 200
