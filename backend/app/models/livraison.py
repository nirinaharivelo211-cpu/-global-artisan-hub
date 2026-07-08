import uuid
from datetime import datetime, timezone
from app.extensions import db


class Hub(db.Model):
    __tablename__ = "hubs"

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    nom = db.Column(db.String(100), nullable=False)
    region = db.Column(db.String(100), nullable=False)
    ville = db.Column(db.String(100), nullable=False)
    adresse = db.Column(db.Text, default="")
    contact = db.Column(db.String(100), default="")
    telephone = db.Column(db.String(20), default="")
    regions_servees = db.Column(db.JSON, default=list)
    support_cod = db.Column(db.Boolean, default=True)
    mm_account_holder = db.Column(db.String(100), default="")
    mvola_number = db.Column(db.String(20), default="")
    airtel_money_number = db.Column(db.String(20), default="")
    orange_money_number = db.Column(db.String(20), default="")
    prix_par_km = db.Column(db.Numeric(10, 2), default=0)
    prix_par_kg = db.Column(db.Numeric(10, 2), default=0)
    delai_defaut_jours = db.Column(db.Integer, default=5)
    quota_quotidien_defaut = db.Column(db.Integer, default=15)
    gestionnaire_id = db.Column(db.String(36), db.ForeignKey("utilisateurs.id"), nullable=True)
    actif = db.Column(db.Boolean, default=True)
    date_creation = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    gestionnaire = db.relationship("Utilisateur", foreign_keys=[gestionnaire_id])
    zones = db.relationship("ZoneLivraison", back_populates="hub", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Hub {self.nom} ({self.ville})>"


class ZoneLivraison(db.Model):
    __tablename__ = "zones_livraison"

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    hub_id = db.Column(db.String(36), db.ForeignKey("hubs.id"), nullable=False)
    nom = db.Column(db.String(100), nullable=False)
    ville = db.Column(db.String(100), default="")
    distance_km = db.Column(db.Numeric(8, 2), nullable=True)
    delai_estime_jours = db.Column(db.Integer, default=3)
    actif = db.Column(db.Boolean, default=True)

    hub = db.relationship("Hub", back_populates="zones")

    __table_args__ = (db.UniqueConstraint("hub_id", "nom", name="uq_zone_hub"),)

    def __repr__(self):
        return f"<ZoneLivraison {self.nom} ({self.hub.nom})>"


class Livraison(db.Model):
    __tablename__ = "livraisons"

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    id_validation = db.Column(db.String(36), db.ForeignKey("validations.id"), nullable=False, unique=True)
    id_utilisateur = db.Column(db.String(36), db.ForeignKey("utilisateurs.id"), nullable=True)
    hub_source_id = db.Column(db.String(36), db.ForeignKey("hubs.id"), nullable=True)
    hub_destination_id = db.Column(db.String(36), db.ForeignKey("hubs.id"), nullable=True)
    zone_livraison_id = db.Column(db.String(36), db.ForeignKey("zones_livraison.id"), nullable=True)
    cooperative_nom = db.Column(db.String(200), default="")
    cooperative_numero_suivi = db.Column(db.String(100), default="")
    date_creation = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    date_prevue = db.Column(db.DateTime, nullable=False)
    date_reelle = db.Column(db.DateTime, nullable=True)
    shipped_at = db.Column(db.DateTime, nullable=True)
    montant_du = db.Column(db.Numeric(10, 2), nullable=False)
    montant_encaisse = db.Column(db.Numeric(10, 2), nullable=True)
    mode_paiement = db.Column(db.String(20), nullable=True)
    statut_paiement = db.Column(db.String(20), default="non_paye", index=True)
    code_qr_livraison = db.Column(db.String(255), unique=True, nullable=True)
    notes = db.Column(db.Text, default="")
    commentaires = db.Column(db.Text, default="")
    date_modification = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), onupdate=datetime.now(timezone.utc))

    validation = db.relationship("Validation", back_populates="livraison")
    livreur = db.relationship("Utilisateur", foreign_keys=[id_utilisateur], backref="livraisons_assignees")
    hub_source = db.relationship("Hub", foreign_keys=[hub_source_id], backref="expeditions")
    hub_destination = db.relationship("Hub", foreign_keys=[hub_destination_id], backref="livraisons_arrivees")
    zone = db.relationship("ZoneLivraison", foreign_keys=[zone_livraison_id])

    MODE_PAIEMENT_CHOICES = ["especes", "Mvola", "orange_money", "airtel_money"]
    STATUT_PAIEMENT_CHOICES = ["non_paye", "partiel", "paye", "refuse"]

    def is_delivered(self) -> bool:
        return self.date_reelle is not None

    def is_paid(self) -> bool:
        return self.statut_paiement == "paye"

    def montant_restant(self):
        if not self.montant_encaisse:
            return self.montant_du
        from decimal import Decimal
        return max(Decimal(str(self.montant_du)) - Decimal(str(self.montant_encaisse)), Decimal("0"))

    def __repr__(self):
        return f"<Livraison {self.id}>"
