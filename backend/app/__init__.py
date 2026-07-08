import os
from flask import Flask
from app.config import config_by_name
from app.extensions import db, migrate, bcrypt, cors, jwt, admin, mail
from app.models import *  # noqa


def create_app(config_name: str = None) -> Flask:
    if config_name is None:
        config_name = os.environ.get("FLASK_ENV", "development")

    app = Flask(__name__)
    app.config.from_object(config_by_name[config_name])

    # Initialize extensions
    db.init_app(app)
    migrate.init_app(app, db)
    bcrypt.init_app(app)
    cors.init_app(app, origins=app.config["CORS_ORIGINS"].split(","))
    jwt.init_app(app)
    mail.init_app(app)
    admin.init_app(app)

    # Register blueprints
    from app.api.auth import auth_bp
    from app.api.utilisateurs import utilisateurs_bp
    from app.api.produits import produits_bp
    from app.api.commandes import commandes_bp
    from app.api.paiements import paiements_bp
    from app.api.livraisons import livraisons_bp
    from app.api.notifications import notifications_bp
    from app.api.b2b import b2b_bp

    app.register_blueprint(auth_bp, url_prefix="/api/auth")
    app.register_blueprint(utilisateurs_bp, url_prefix="/api/utilisateurs")
    app.register_blueprint(produits_bp, url_prefix="/api/produits")
    app.register_blueprint(commandes_bp, url_prefix="/api/commandes")
    app.register_blueprint(paiements_bp, url_prefix="/api/paiements")
    app.register_blueprint(livraisons_bp, url_prefix="/api/livraisons")
    app.register_blueprint(notifications_bp, url_prefix="/api/notifications")
    app.register_blueprint(b2b_bp, url_prefix="/api/b2b")

    # Webhooks (no auth)
    from app.webhooks.stripe import stripe_webhook_bp
    from app.webhooks.flutterwave import flutterwave_webhook_bp
    app.register_blueprint(stripe_webhook_bp, url_prefix="/api/webhooks")
    app.register_blueprint(flutterwave_webhook_bp, url_prefix="/api/webhooks")

    # Health check
    @app.route("/api/health")
    def health():
        return {"status": "ok", "message": "TISSAGE API is running"}

    # Error handlers
    @app.errorhandler(404)
    def not_found(e):
        return {"error": "Not found"}, 404

    @app.errorhandler(500)
    def server_error(e):
        return {"error": "Internal server error"}, 500

    # Create tables if they don't exist (safe for both SQLite and PostgreSQL)
    with app.app_context():
        try:
            db.create_all()
        except Exception as e:
            app.logger.warning("Could not auto-create tables (likely already exist via init-db): %s", e)

    return app
