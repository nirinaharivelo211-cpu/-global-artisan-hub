import uuid
from datetime import datetime, timezone
from app.extensions import db


class Categorie(db.Model):
    __tablename__ = "categories"

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    nom = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text, default="")
    image = db.Column(db.String(255), default="")

    produits = db.relationship("Produit", back_populates="categorie")

    def __repr__(self):
        return f"<Categorie {self.nom}>"


class Produit(db.Model):
    __tablename__ = "produits"

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    id_utilisateur = db.Column(db.String(36), db.ForeignKey("utilisateurs.id"), nullable=False)
    id_categorie = db.Column(db.String(36), db.ForeignKey("categories.id"), nullable=False)
    nom = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text, default="")
    prix = db.Column(db.Numeric(10, 2), nullable=False)
    poids = db.Column(db.Numeric(10, 3), nullable=True)
    image = db.Column(db.String(255), default="")
    statut = db.Column(db.String(20), default="publie")
    suspendu_jusqua = db.Column(db.DateTime, nullable=True)
    suspension_motif = db.Column(db.Text, default="")
    date_ajout = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    utilisateur = db.relationship("Utilisateur", backref="produits")
    categorie = db.relationship("Categorie", back_populates="produits")
    variations = db.relationship("ProduitVariation", back_populates="produit", cascade="all, delete-orphan")
    images = db.relationship("ProduitImage", back_populates="produit", cascade="all, delete-orphan")
    avis = db.relationship("Avis", back_populates="produit", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Produit {self.nom}>"


class ProduitVariation(db.Model):
    __tablename__ = "produits_variations"

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    produit_id = db.Column(db.String(36), db.ForeignKey("produits.id"), nullable=False)
    couleur = db.Column(db.String(50), nullable=True)
    couleur_nom = db.Column(db.String(50), nullable=True)
    taille = db.Column(db.String(50), nullable=True)
    type_mesure = db.Column(db.String(20), nullable=True)
    poids = db.Column(db.Numeric(10, 2), default=0)
    prix = db.Column(db.Numeric(10, 2), nullable=False)
    stock = db.Column(db.Integer, default=0)
    seuil_alerte = db.Column(db.Integer, default=5)
    remise = db.Column(db.Numeric(5, 2), nullable=True)
    image_id = db.Column(db.String(36), db.ForeignKey("produits_images.id"), nullable=True)

    produit = db.relationship("Produit", back_populates="variations")
    image = db.relationship("ProduitImage", backref="variation_ref")

    __table_args__ = (
        db.UniqueConstraint("produit_id", "couleur_nom", "taille", name="uq_produit_variation"),
    )

    def __repr__(self):
        parts = [self.couleur, self.taille]
        label = ", ".join(p for p in parts if p)
        return f"<Variation {self.produit.nom} ({label})>" if label else f"<Variation {self.produit.nom}>"


class ProduitImage(db.Model):
    __tablename__ = "produits_images"

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    produit_id = db.Column(db.String(36), db.ForeignKey("produits.id"), nullable=False)
    image = db.Column(db.String(255), nullable=False)
    sort_order = db.Column(db.Integer, default=0)

    produit = db.relationship("Produit", back_populates="images")

    def __repr__(self):
        return f"<Image for {self.produit.nom}>"


class Avis(db.Model):
    __tablename__ = "avis"

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    id_utilisateur = db.Column(db.String(36), db.ForeignKey("utilisateurs.id"), nullable=False)
    id_produit = db.Column(db.String(36), db.ForeignKey("produits.id"), nullable=False)
    note = db.Column(db.Integer, nullable=False)
    commentaire = db.Column(db.Text, default="")
    date_avis = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    utilisateur = db.relationship("Utilisateur", backref="avis")
    produit = db.relationship("Produit", back_populates="avis")

    def __repr__(self):
        return f"<Avis {self.note}/5 by {self.id_utilisateur}>"
