import uuid
from datetime import datetime, timezone
from decimal import Decimal
from app.extensions import db


# Enums as Python constants
class OrderStatus:
    PENDING = "pending"
    CONFIRMED = "confirmed"
    AWAITING_PAYMENT = "awaiting_payment"
    PAID = "paid"
    PREPARING = "preparing"
    PRETE = "prete"
    SHIPPED = "shipped"
    IN_DELIVERY = "in_delivery"
    DELIVERED = "delivered"
    CANCELLED = "cancelled"
    RETURNED = "returned"
    FORWARDED = "forwarded"
    ECHEC = "echec"

    CHOICES = [
        (PENDING, "Pending"),
        (CONFIRMED, "Confirmed"),
        (AWAITING_PAYMENT, "Awaiting Payment"),
        (PAID, "Paid"),
        (PREPARING, "Preparing"),
        (PRETE, "Prete"),
        (SHIPPED, "Shipped"),
        (IN_DELIVERY, "In Delivery"),
        (DELIVERED, "Delivered"),
        (CANCELLED, "Cancelled"),
        (RETURNED, "Returned"),
        (FORWARDED, "Forwarded"),
        (ECHEC, "Echec"),
    ]


class PaymentMethod:
    MOBILE_MONEY = "mobile_money"
    CASH_ON_DELIVERY = "cash_on_delivery"
    STRIPE = "stripe"
    FLUTTERWAVE = "flutterwave"
    CARD = "card"

    CHOICES = [
        (MOBILE_MONEY, "Mobile Money"),
        (CASH_ON_DELIVERY, "Cash on Delivery"),
        (STRIPE, "Stripe (Card)"),
        (FLUTTERWAVE, "Flutterwave"),
        (CARD, "Card"),
    ]


class PaymentGateway:
    STRIPE = "stripe"
    FLUTTERWAVE = "flutterwave"
    MOBILE_MONEY = "mobile_money"

    CHOICES = [
        (STRIPE, "Stripe"),
        (FLUTTERWAVE, "Flutterwave"),
        (MOBILE_MONEY, "Mobile Money"),
    ]


class TransactionStatus:
    PENDING = "pending"
    SUCCESS = "success"
    FAILED = "failed"
    CANCELLED = "cancelled"
    REFUNDED = "refunded"

    CHOICES = [
        (PENDING, "Pending"),
        (SUCCESS, "Success"),
        (FAILED, "Failed"),
        (CANCELLED, "Cancelled"),
        (REFUNDED, "Refunded"),
    ]


class ColisStatus:
    PREPARING = "preparing"
    DEPOSITED = "deposited"
    DISPATCHED = "dispatched"
    COLLECTED = "collected"

    CHOICES = [
        (PREPARING, "Preparing"),
        (DEPOSITED, "Deposited"),
        (DISPATCHED, "Dispatched"),
        (COLLECTED, "Collected"),
    ]


VALID_TRANSITIONS = {
    OrderStatus.PENDING: [OrderStatus.CONFIRMED, OrderStatus.CANCELLED],
    OrderStatus.CONFIRMED: [OrderStatus.AWAITING_PAYMENT, OrderStatus.PREPARING, OrderStatus.CANCELLED],
    OrderStatus.AWAITING_PAYMENT: [OrderStatus.PAID, OrderStatus.CANCELLED],
    OrderStatus.PAID: [OrderStatus.PREPARING, OrderStatus.CANCELLED],
    OrderStatus.PREPARING: [OrderStatus.PRETE, OrderStatus.CANCELLED],
    OrderStatus.PRETE: [OrderStatus.SHIPPED, OrderStatus.CANCELLED],
    OrderStatus.SHIPPED: [OrderStatus.IN_DELIVERY, OrderStatus.CANCELLED],
    OrderStatus.IN_DELIVERY: [OrderStatus.DELIVERED, OrderStatus.CANCELLED, OrderStatus.RETURNED],
    OrderStatus.DELIVERED: [OrderStatus.RETURNED],
    OrderStatus.CANCELLED: [],
    OrderStatus.RETURNED: [],
    OrderStatus.FORWARDED: [],
    OrderStatus.ECHEC: [],
}


class ShippingAddress(db.Model):
    __tablename__ = "shipping_addresses"

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    region = db.Column(db.String(100), default="")
    city = db.Column(db.String(100), nullable=False)
    address = db.Column(db.Text, nullable=False)
    date_creation = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    date_modification = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), onupdate=datetime.now(timezone.utc))

    def __repr__(self):
        return f"<ShippingAddress {self.city}>"


class Order(db.Model):
    __tablename__ = "commandes"

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    id_utilisateur = db.Column(db.String(36), db.ForeignKey("utilisateurs.id"), nullable=False)
    shipping_address_id = db.Column(db.String(36), db.ForeignKey("shipping_addresses.id"), nullable=True)
    status = db.Column(db.String(20), default=OrderStatus.PENDING, index=True)
    payment_method = db.Column(db.String(20), default=PaymentMethod.MOBILE_MONEY)
    montant_total = db.Column(db.Numeric(10, 2), nullable=False)
    frais_livraison = db.Column(db.Numeric(10, 2), default=0)
    qr_code = db.Column(db.Text, nullable=True)
    notes = db.Column(db.Text, default="")
    date_creation = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    date_modification = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), onupdate=datetime.now(timezone.utc))
    date_confirmation = db.Column(db.DateTime, nullable=True)
    date_preparation = db.Column(db.DateTime, nullable=True)
    date_livraison = db.Column(db.DateTime, nullable=True)

    utilisateur = db.relationship("Utilisateur", backref="commandes")
    shipping_address = db.relationship("ShippingAddress", backref="commande", uselist=False)
    items = db.relationship("OrderItem", back_populates="order", cascade="all, delete-orphan")

    def can_transition_to(self, new_status: str) -> bool:
        return new_status in VALID_TRANSITIONS.get(self.status, [])

    def transition_to(self, new_status: str):
        if not self.can_transition_to(new_status):
            raise ValueError(f"Invalid transition from {self.status} to {new_status}")
        now = datetime.now(timezone.utc)
        if new_status == OrderStatus.CONFIRMED and not self.date_confirmation:
            self.date_confirmation = now
        elif new_status == OrderStatus.PREPARING and not self.date_preparation:
            self.date_preparation = now
        elif new_status == OrderStatus.DELIVERED and not self.date_livraison:
            self.date_livraison = now
        self.status = new_status
        self.date_modification = now

    def is_terminal(self) -> bool:
        return self.status in [OrderStatus.DELIVERED, OrderStatus.CANCELLED, OrderStatus.RETURNED]

    def __repr__(self):
        return f"<Order {self.id} {self.status}>"


class OrderItem(db.Model):
    __tablename__ = "commandes_items"

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    order_id = db.Column(db.String(36), db.ForeignKey("commandes.id"), nullable=False)
    id_produit = db.Column(db.String(36), db.ForeignKey("produits.id"), nullable=False)
    produit_variation_id = db.Column(db.String(36), db.ForeignKey("produits_variations.id"), nullable=True)
    quantite = db.Column(db.Integer, default=1)
    prix_unitaire = db.Column(db.Numeric(10, 2), nullable=False)
    date_ajout = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    order = db.relationship("Order", back_populates="items")
    produit = db.relationship("Produit", backref="order_items")
    variation = db.relationship("ProduitVariation", backref="order_items")

    @property
    def total(self) -> Decimal:
        return Decimal(str(self.prix_unitaire)) * self.quantite

    __table_args__ = (
        db.UniqueConstraint("order_id", "id_produit", "produit_variation_id", name="uq_order_item"),
    )


class CartSession(db.Model):
    __tablename__ = "cart_sessions"

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    id_utilisateur = db.Column(db.String(36), db.ForeignKey("utilisateurs.id"), nullable=False)
    statut = db.Column(db.String(20), default="active")
    date_creation = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    date_modification = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), onupdate=datetime.now(timezone.utc))
    date_expiration = db.Column(db.DateTime, nullable=True)

    utilisateur = db.relationship("Utilisateur", backref="cart_sessions")
    items = db.relationship("Panier", back_populates="cart_session", cascade="all, delete-orphan")


class Panier(db.Model):
    __tablename__ = "paniers"

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    cart_session_id = db.Column(db.String(36), db.ForeignKey("cart_sessions.id"), nullable=False)
    id_utilisateur = db.Column(db.String(36), db.ForeignKey("utilisateurs.id"), nullable=False)
    id_produit = db.Column(db.String(36), db.ForeignKey("produits.id"), nullable=False)
    produit_variation_id = db.Column(db.String(36), db.ForeignKey("produits_variations.id"), nullable=True)
    quantite = db.Column(db.Integer, default=1)
    prix_unitaire = db.Column(db.Numeric(10, 2), nullable=False)
    snapshot_couleur = db.Column(db.String(50), default="")
    snapshot_couleur_nom = db.Column(db.String(50), default="")
    snapshot_taille = db.Column(db.String(50), default="")
    snapshot_type_mesure = db.Column(db.String(20), default="")
    snapshot_poids = db.Column(db.Numeric(10, 2), nullable=True)
    fulfillment_status = db.Column(db.String(20), default="")
    fulfillment_quantity = db.Column(db.Integer, nullable=True)
    cancel_if_partial = db.Column(db.Boolean, default=True)
    expedition_mode = db.Column(db.String(20), default="")
    expedition_cooperative = db.Column(db.String(200), default="")
    expedition_numero_colis = db.Column(db.String(120), default="")
    expedition_submitted_at = db.Column(db.DateTime, nullable=True)
    colis_id = db.Column(db.String(36), db.ForeignKey("colis.id"), nullable=True)
    date_ajout = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    cart_session = db.relationship("CartSession", back_populates="items")
    utilisateur = db.relationship("Utilisateur", backref="panier_items")
    produit = db.relationship("Produit", backref="panier_items")
    variation = db.relationship("ProduitVariation", backref="panier_items")
    colis = db.relationship("Colis", backref="panier_items")

    __table_args__ = (
        db.UniqueConstraint("cart_session_id", "id_produit", "produit_variation_id", name="uq_panier_item"),
    )


class Validation(db.Model):
    __tablename__ = "validations"

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    id_panier = db.Column(db.String(36), db.ForeignKey("paniers.id"), nullable=False)
    frais_livraison = db.Column(db.Numeric(10, 2), default=0)
    montant_total = db.Column(db.Numeric(10, 2), nullable=False)
    statut = db.Column(db.String(20), default="pending")
    adresse_livraison = db.Column(db.Text, nullable=False)
    region = db.Column(db.String(100), default="")
    hub_destination_id = db.Column(db.String(36), db.ForeignKey("hubs.id"), nullable=True)
    zone_livraison_id = db.Column(db.String(36), db.ForeignKey("zones_livraison.id"), nullable=True)
    payment_method = db.Column(db.String(24), default="")
    payment_instructions = db.Column(db.Text, default="")
    mobile_money_provider = db.Column(db.String(20), default="")
    reminder_sent_at = db.Column(db.DateTime, nullable=True)
    auto_cancel_at = db.Column(db.DateTime, nullable=True)
    payment_transaction_ref = db.Column(db.String(50), default="")
    date_creation = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    panier = db.relationship("Panier")
    hub_destination = db.relationship("Hub", foreign_keys=[hub_destination_id])
    zone_livraison = db.relationship("ZoneLivraison", foreign_keys=[zone_livraison_id])
    facture = db.relationship("Facture", uselist=False, back_populates="validation")
    livraison = db.relationship("Livraison", uselist=False, back_populates="validation")


class Facture(db.Model):
    __tablename__ = "factures"

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    id_validation = db.Column(db.String(36), db.ForeignKey("validations.id"), nullable=False, unique=True)
    numero_facture = db.Column(db.String(50), unique=True, nullable=False)
    statut = db.Column(db.String(20), default="awaiting_payment")
    qr_code = db.Column(db.Text, nullable=False)
    date_emission = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    date_paiement = db.Column(db.DateTime, nullable=True)
    date_livraison = db.Column(db.DateTime, nullable=True)

    validation = db.relationship("Validation", back_populates="facture")


class Colis(db.Model):
    __tablename__ = "colis"

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    uuid = db.Column(db.String(36), unique=True, nullable=False, default=lambda: str(uuid.uuid4()))
    qr_code = db.Column(db.Text, default="")
    validation_id = db.Column(db.String(36), db.ForeignKey("validations.id"), nullable=False)
    artisan_id = db.Column(db.String(36), db.ForeignKey("utilisateurs.id"), nullable=False)
    statut = db.Column(db.String(20), default="preparing")
    mode = db.Column(db.String(20), default="")
    numero_colis = db.Column(db.String(120), default="")
    cooperative_nom = db.Column(db.String(200), default="")
    lieu_depart = db.Column(db.String(200), default="")
    submitted_at = db.Column(db.DateTime, nullable=True)
    collected_at = db.Column(db.DateTime, nullable=True)
    collected_by = db.Column(db.String(36), db.ForeignKey("utilisateurs.id"), nullable=True)
    date_creation = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    validation = db.relationship("Validation", backref="colis_list")
    artisan = db.relationship("Utilisateur", foreign_keys=[artisan_id], backref="colis_artisan")
    collector = db.relationship("Utilisateur", foreign_keys=[collected_by], backref="colis_collected")


class ReversementArtisan(db.Model):
    __tablename__ = "reversements_artisan"

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    validation_id = db.Column(db.String(36), db.ForeignKey("validations.id"), nullable=False)
    artisan_id = db.Column(db.String(36), db.ForeignKey("utilisateurs.id"), nullable=False)
    montant_brut = db.Column(db.Numeric(10, 2), nullable=False)
    commission = db.Column(db.Numeric(10, 2), nullable=False)
    montant_net = db.Column(db.Numeric(10, 2), nullable=False)
    date_creation = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    validation = db.relationship("Validation", backref="reversements")
    artisan = db.relationship("Utilisateur", foreign_keys=[artisan_id], backref="reversements")


class DemandePaiement(db.Model):
    __tablename__ = "demandes_paiement"

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    artisan_id = db.Column(db.String(36), db.ForeignKey("utilisateurs.id"), nullable=False)
    hub_id = db.Column(db.String(36), db.ForeignKey("hubs.id"), nullable=True)
    montant = db.Column(db.Numeric(10, 2), nullable=False)
    statut = db.Column(db.String(20), default="pending")
    reference_paiement = db.Column(db.String(120), default="")
    mode_paiement = db.Column(db.String(50), default="")
    mode_paiement_artisan = db.Column(db.String(20), default="")
    reference_mm = db.Column(db.String(30), default="")
    titulaire_mm = db.Column(db.String(100), default="")
    notes = db.Column(db.Text, default="")
    date_demande = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    date_paiement = db.Column(db.DateTime, nullable=True)

    artisan = db.relationship("Utilisateur", foreign_keys=[artisan_id], backref="demandes_paiement")
    hub = db.relationship("Hub", backref="demandes_paiement")


class PaymentTransaction(db.Model):
    __tablename__ = "payment_transactions"

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    validation_id = db.Column(db.String(36), db.ForeignKey("validations.id"), nullable=True)
    facture_id = db.Column(db.String(36), db.ForeignKey("factures.id"), nullable=True)
    gateway = db.Column(db.String(20), nullable=False)
    gateway_transaction_id = db.Column(db.String(255), default="")
    montant = db.Column(db.Numeric(10, 2), nullable=False)
    devise = db.Column(db.String(10), default="MGA")
    statut = db.Column(db.String(20), default="pending", index=True)
    gateway_response = db.Column(db.JSON, default=dict)
    error_message = db.Column(db.Text, default="")
    refunded_at = db.Column(db.DateTime, nullable=True)
    date_creation = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    date_modification = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), onupdate=datetime.now(timezone.utc))

    validation = db.relationship("Validation", backref="payment_transactions")
    facture = db.relationship("Facture", backref="payment_transactions")

    def __repr__(self):
        return f"<PaymentTransaction {self.gateway} #{self.id} {self.montant} {self.devise} ({self.statut})>"
