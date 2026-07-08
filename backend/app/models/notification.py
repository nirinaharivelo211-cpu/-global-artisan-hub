import uuid
from datetime import datetime, timezone
from app.extensions import db


class Notification(db.Model):
    __tablename__ = "notifications"

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    id_utilisateur = db.Column(db.String(36), db.ForeignKey("utilisateurs.id"), nullable=False, index=True)
    categorie = db.Column(db.String(20), default="autre", index=True)
    type_notif = db.Column(db.String(50), default="autre")
    titre = db.Column(db.String(100), nullable=False)
    message = db.Column(db.Text, nullable=False)
    lien = db.Column(db.String(255), nullable=True)
    icone = db.Column(db.String(50), default="bell")
    couleur = db.Column(db.String(20), default="default")
    est_lu = db.Column(db.Boolean, default=False, index=True)
    date_creation = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), index=True)
    date_lecture = db.Column(db.DateTime, nullable=True)

    utilisateur = db.relationship("Utilisateur", backref="notifications")

    def mark_as_read(self):
        if not self.est_lu:
            self.est_lu = True
            self.date_lecture = datetime.now(timezone.utc)

    def __repr__(self):
        return f"<Notification {self.titre} -> {self.id_utilisateur}>"
