import uuid
from datetime import datetime, timezone
from app.extensions import db, bcrypt


class Utilisateur(db.Model):
    __tablename__ = "utilisateurs"

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    email = db.Column(db.String(255), unique=True, nullable=False, index=True)
    nom = db.Column(db.String(100), nullable=False)
    prenom = db.Column(db.String(100), nullable=False)
    mdp = db.Column(db.String(255), nullable=False)
    role = db.Column(
        db.String(10),
        nullable=False,
        default="client",
        index=True,
    )
    telephone = db.Column(db.String(20), default="")
    photo_de_profil = db.Column(db.String(255), default="")
    description = db.Column(db.Text, default="")
    region = db.Column(db.String(100), default="")
    code_qr = db.Column(db.Text, default="")
    statut = db.Column(db.String(20), default="actif")
    is_active = db.Column(db.Boolean, default=True)
    is_staff = db.Column(db.Boolean, default=False)
    force_password_change = db.Column(db.Boolean, default=False)
    last_password_change = db.Column(db.DateTime, nullable=True)
    reset_code = db.Column(db.String(6), nullable=True)
    reset_code_expires_at = db.Column(db.DateTime, nullable=True)
    reset_attempts = db.Column(db.Integer, default=0)
    last_reset_request = db.Column(db.DateTime, nullable=True)
    suspendu_jusqua = db.Column(db.DateTime, nullable=True)
    suspension_motif = db.Column(db.Text, default="")
    hub_id = db.Column(db.String(36), db.ForeignKey("hubs.id"), nullable=True)
    zone_livraison_id = db.Column(db.String(36), db.ForeignKey("zones_livraison.id"), nullable=True)
    quota_quotidien = db.Column(db.Integer, default=8)
    date_inscription = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    hub = db.relationship("Hub", foreign_keys=[hub_id], backref="utilisateurs")
    zone_livraison = db.relationship("ZoneLivraison", foreign_keys=[zone_livraison_id])

    societe = db.relationship("Societe", uselist=False, back_populates="utilisateur")

    def set_password(self, password: str):
        self.mdp = bcrypt.generate_password_hash(password).decode("utf-8")

    def check_password(self, password: str) -> bool:
        return bcrypt.check_password_hash(self.mdp, password)

    @property
    def full_name(self) -> str:
        return f"{self.prenom} {self.nom}"

    def __repr__(self):
        return f"<Utilisateur {self.email} ({self.role})>"


ROLE_CHOICES = ["admin", "manager", "artisan", "client", "livreur"]
REGIONS_CHOICES = [
    "Alaotra-Mangoro", "Amoron'i Mania", "Analamanga", "Analanjirofo",
    "Androy", "Anosy", "Atsimo-Andrefana", "Atsimo-Atsinanana",
    "Atsinanana", "Betsiboka", "Boeny", "Bongolava",
    "Diana", "Haute Matsiatra", "Ihorombe", "Itasy",
    "Melaky", "Menabe", "Sava", "Sofia",
    "Vakinankaratra", "Vatovavy", "Fitovinany",
]
