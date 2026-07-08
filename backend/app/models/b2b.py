import uuid
from datetime import datetime, timezone
from decimal import Decimal
from app.extensions import db


class Societe(db.Model):
    __tablename__ = "b2b_societes"

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    utilisateur_id = db.Column(db.String(36), db.ForeignKey("utilisateurs.id"), nullable=False, unique=True)
    nom = db.Column(db.String(200), nullable=False)
    type_entreprise = db.Column(db.String(20), default="entreprise")
    nif = db.Column(db.String(50), default="")
    stat = db.Column(db.String(50), default="")
    adresse = db.Column(db.Text, default="")
    ville = db.Column(db.String(100), default="")
    pays = db.Column(db.String(100), default="Madagascar")
    telephone = db.Column(db.String(20), default="")
    site_web = db.Column(db.String(200), default="")
    description = db.Column(db.Text, default="")
    secteur_activite = db.Column(db.String(100), default="")
    remise_globale = db.Column(db.Numeric(5, 2), default=0)
    statut = db.Column(db.String(20), default="pending")
    date_approbation = db.Column(db.DateTime, nullable=True)
    date_creation = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    date_modification = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), onupdate=datetime.now(timezone.utc))

    utilisateur = db.relationship("Utilisateur", back_populates="societe")
    catalogues = db.relationship("CataloguePro", back_populates="societe", cascade="all, delete-orphan")
    devis = db.relationship("Devis", back_populates="societe", cascade="all, delete-orphan")
    contrats = db.relationship("ContratFournisseur", back_populates="societe", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Societe {self.nom}>"


class CataloguePro(db.Model):
    __tablename__ = "b2b_catalogue"

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    societe_id = db.Column(db.String(36), db.ForeignKey("b2b_societes.id"), nullable=False)
    produit_id = db.Column(db.String(36), db.ForeignKey("produits.id"), nullable=False)
    variation_id = db.Column(db.String(36), db.ForeignKey("produits_variations.id"), nullable=True)
    prix_personnalise = db.Column(db.Numeric(10, 2), nullable=True)
    actif = db.Column(db.Boolean, default=True)
    date_creation = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    societe = db.relationship("Societe", back_populates="catalogues")
    produit = db.relationship("Produit", backref="b2b_catalogues")
    variation = db.relationship("ProduitVariation", backref="b2b_catalogues")
    grilles = db.relationship("GrilleTarifaireB2B", back_populates="catalogue", cascade="all, delete-orphan")

    __table_args__ = (
        db.UniqueConstraint("societe_id", "produit_id", "variation_id", name="uq_b2b_catalogue"),
    )

    def __repr__(self):
        return f"<CataloguePro {self.produit.nom} for {self.societe.nom}>"


class GrilleTarifaireB2B(db.Model):
    __tablename__ = "b2b_grilles_tarifaires"

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    catalogue_id = db.Column(db.String(36), db.ForeignKey("b2b_catalogue.id"), nullable=False)
    quantite_min = db.Column(db.Integer, nullable=False)
    quantite_max = db.Column(db.Integer, nullable=True)
    prix_unitaire = db.Column(db.Numeric(10, 2), nullable=False)

    catalogue = db.relationship("CataloguePro", back_populates="grilles")

    def __repr__(self):
        return f"<Grille {self.quantite_min}+ -> {self.prix_unitaire}>"


class Devis(db.Model):
    __tablename__ = "b2b_devis"

    STATUT_CHOICES = ["brouillon", "envoye", "vu", "negociation", "accepte", "refuse", "transforme_en_commande", "expire"]

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    numero = db.Column(db.String(20), unique=True, nullable=False)
    societe_id = db.Column(db.String(36), db.ForeignKey("b2b_societes.id"), nullable=False)
    artisan_id = db.Column(db.String(36), db.ForeignKey("utilisateurs.id"), nullable=False)
    statut = db.Column(db.String(20), default="brouillon", index=True)
    montant_ht = db.Column(db.Numeric(10, 2), default=0)
    montant_ttc = db.Column(db.Numeric(10, 2), default=0)
    remise = db.Column(db.Numeric(5, 2), default=0)
    notes = db.Column(db.Text, default="")
    conditions = db.Column(db.Text, default="")
    valable_jusqua = db.Column(db.DateTime, nullable=True)
    date_envoi = db.Column(db.DateTime, nullable=True)
    date_reponse = db.Column(db.DateTime, nullable=True)
    date_creation = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    date_modification = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), onupdate=datetime.now(timezone.utc))

    societe = db.relationship("Societe", back_populates="devis")
    artisan = db.relationship("Utilisateur", foreign_keys=[artisan_id], backref="devis_recus")
    lignes = db.relationship("LigneDevis", back_populates="devis", cascade="all, delete-orphan")

    def calculer_montants(self):
        ht = sum(Decimal(str(l.total_ht)) for l in self.lignes)
        self.montant_ht = ht
        self.montant_ttc = ht * (1 - Decimal(str(self.remise)) / Decimal("100"))

    def __repr__(self):
        return f"<Devis {self.numero} - {self.statut}>"


class LigneDevis(db.Model):
    __tablename__ = "b2b_lignes_devis"

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    devis_id = db.Column(db.String(36), db.ForeignKey("b2b_devis.id"), nullable=False)
    produit_id = db.Column(db.String(36), db.ForeignKey("produits.id"), nullable=False)
    variation_id = db.Column(db.String(36), db.ForeignKey("produits_variations.id"), nullable=True)
    description = db.Column(db.String(255), default="")
    quantite = db.Column(db.Integer, nullable=False)
    prix_unitaire = db.Column(db.Numeric(10, 2), nullable=False)

    devis = db.relationship("Devis", back_populates="lignes")
    produit = db.relationship("Produit")
    variation = db.relationship("ProduitVariation")

    @property
    def total_ht(self) -> Decimal:
        return Decimal(str(self.prix_unitaire)) * self.quantite

    def __repr__(self):
        return f"<LigneDevis {self.produit.nom} x{self.quantite}>"


class ContratFournisseur(db.Model):
    __tablename__ = "b2b_contrats"

    STATUT_CHOICES = ["brouillon", "en_attente_signature", "actif", "resilie", "expire"]

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    numero = db.Column(db.String(20), unique=True, nullable=False)
    societe_id = db.Column(db.String(36), db.ForeignKey("b2b_societes.id"), nullable=False)
    artisan_id = db.Column(db.String(36), db.ForeignKey("utilisateurs.id"), nullable=False)
    statut = db.Column(db.String(20), default="brouillon", index=True)
    date_debut = db.Column(db.DateTime, nullable=False)
    date_fin = db.Column(db.DateTime, nullable=False)
    reconduction_auto = db.Column(db.Boolean, default=False)
    conditions = db.Column(db.Text, default="")
    remise_negociee = db.Column(db.Numeric(5, 2), default=0)
    signe_par_client = db.Column(db.Boolean, default=False)
    signe_par_artisan = db.Column(db.Boolean, default=False)
    date_signature_client = db.Column(db.DateTime, nullable=True)
    date_signature_artisan = db.Column(db.DateTime, nullable=True)
    date_creation = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    date_modification = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), onupdate=datetime.now(timezone.utc))

    societe = db.relationship("Societe", back_populates="contrats")
    artisan = db.relationship("Utilisateur", foreign_keys=[artisan_id], backref="contrats_artisan")

    def est_signe(self) -> bool:
        return self.signe_par_client and self.signe_par_artisan

    def est_actif(self) -> bool:
        now = datetime.now(timezone.utc)
        return self.statut == "actif" and self.date_debut <= now <= self.date_fin

    def __repr__(self):
        return f"<Contrat {self.numero} - {self.statut}>"
