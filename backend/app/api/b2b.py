import uuid
from datetime import datetime, timezone
from decimal import Decimal
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from app.extensions import db
from app.models.b2b import Societe, CataloguePro, GrilleTarifaireB2B, Devis, LigneDevis, ContratFournisseur
from app.models.utilisateur import Utilisateur
from app.models.produit import Produit, ProduitVariation

b2b_bp = Blueprint("b2b", __name__)


# ----- Societe -----

@b2b_bp.route("/societes", methods=["GET"])
@jwt_required()
def list_societes():
    identity = get_jwt_identity()
    claims = get_jwt()
    role = claims.get("role", "")

    if role in ("admin", "manager"):
        societes = Societe.query.all()
    elif role == "client":
        societes = Societe.query.filter_by(utilisateur_id=identity).all()
    else:
        return jsonify({"error": "Accès non autorisé"}), 403

    return jsonify([_societe_json(s) for s in societes])


@b2b_bp.route("/societes", methods=["POST"])
@jwt_required()
def create_societe():
    identity = get_jwt_identity()
    user = Utilisateur.query.get(identity)
    if not user or user.role != "client":
        return jsonify({"error": "Accès client requis"}), 403
    if Societe.query.filter_by(utilisateur_id=identity).first():
        return jsonify({"error": "Vous avez déjà une société"}), 409

    data = request.get_json() or {}
    if not data.get("nom"):
        return jsonify({"error": "Nom requis"}), 400

    societe = Societe(
        id=str(uuid.uuid4()),
        utilisateur_id=identity,
        nom=data["nom"],
        type_entreprise=data.get("type_entreprise", "entreprise"),
        nif=data.get("nif", ""), stat=data.get("stat", ""),
        adresse=data.get("adresse", ""), ville=data.get("ville", ""),
        telephone=data.get("telephone", ""),
        description=data.get("description", ""),
        secteur_activite=data.get("secteur_activite", ""),
    )
    db.session.add(societe)
    db.session.commit()
    return jsonify(_societe_json(societe)), 201


@b2b_bp.route("/societes/<societe_id>/approve", methods=["PATCH"])
@jwt_required()
def approve_societe(societe_id):
    claims = get_jwt()
    if claims.get("role") not in ("admin", "manager"):
        return jsonify({"error": "Accès non autorisé"}), 403

    societe = Societe.query.get(societe_id)
    if not societe:
        return jsonify({"error": "Société introuvable"}), 404

    societe.statut = "approved"
    societe.date_approbation = datetime.now(timezone.utc)
    db.session.commit()
    return jsonify({"message": "Société approuvée"})


@b2b_bp.route("/societes/<societe_id>/reject", methods=["PATCH"])
@jwt_required()
def reject_societe(societe_id):
    claims = get_jwt()
    if claims.get("role") not in ("admin", "manager"):
        return jsonify({"error": "Accès non autorisé"}), 403

    societe = Societe.query.get(societe_id)
    if not societe:
        return jsonify({"error": "Société introuvable"}), 404

    societe.statut = "rejected"
    db.session.commit()
    return jsonify({"message": "Société refusée"})


# ----- Catalogue Pro -----

@b2b_bp.route("/catalogue", methods=["GET"])
@jwt_required()
def list_catalogue():
    identity = get_jwt_identity()
    claims = get_jwt()
    role = claims.get("role", "")

    if role in ("admin", "manager"):
        catalogue = CataloguePro.query.all()
    elif role == "client":
        societe = Societe.query.filter_by(utilisateur_id=identity).first()
        if not societe:
            return jsonify({"catalogue": []})
        catalogue = CataloguePro.query.filter_by(societe_id=societe.id).all()
    else:
        return jsonify({"error": "Accès non autorisé"}), 403

    return jsonify([{
        "id": c.id, "societe_id": c.societe_id,
        "produit_id": c.produit_id, "variation_id": c.variation_id,
        "prix_personnalise": str(c.prix_personnalise) if c.prix_personnalise else None,
        "actif": c.actif,
        "produit_nom": c.produit.nom if c.produit else "",
        "grilles": [{
            "id": g.id, "quantite_min": g.quantite_min,
            "quantite_max": g.quantite_max, "prix_unitaire": str(g.prix_unitaire),
        } for g in c.grilles],
    } for c in catalogue])


@b2b_bp.route("/catalogue", methods=["POST"])
@jwt_required()
def add_to_catalogue():
    identity = get_jwt_identity()
    user = Utilisateur.query.get(identity)
    if not user or user.role != "client":
        return jsonify({"error": "Accès client requis"}), 403

    societe = Societe.query.filter_by(utilisateur_id=identity).first()
    if not societe:
        return jsonify({"error": "Créez d'abord votre société"}), 400

    data = request.get_json() or {}
    if not data.get("produit_id"):
        return jsonify({"error": "produit_id requis"}), 400

    existing = CataloguePro.query.filter_by(
        societe_id=societe.id, produit_id=data["produit_id"],
        variation_id=data.get("variation_id"),
    ).first()
    if existing:
        return jsonify({"error": "Déjà dans le catalogue"}), 409

    cat = CataloguePro(
        id=str(uuid.uuid4()),
        societe_id=societe.id,
        produit_id=data["produit_id"],
        variation_id=data.get("variation_id"),
        prix_personnalise=data.get("prix_personnalise"),
    )
    db.session.add(cat)
    db.session.flush()

    for grille in data.get("grilles", []):
        g = GrilleTarifaireB2B(
            id=str(uuid.uuid4()),
            catalogue_id=cat.id,
            quantite_min=grille["quantite_min"],
            quantite_max=grille.get("quantite_max"),
            prix_unitaire=grille["prix_unitaire"],
        )
        db.session.add(g)

    db.session.commit()
    return jsonify({"message": "Ajouté au catalogue", "id": cat.id}), 201


# ----- Devis -----

@b2b_bp.route("/devis", methods=["GET"])
@jwt_required()
def list_devis():
    identity = get_jwt_identity()
    claims = get_jwt()
    role = claims.get("role", "")

    if role in ("admin", "manager"):
        devis = Devis.query.all()
    elif role == "client":
        societe = Societe.query.filter_by(utilisateur_id=identity).first()
        if not societe:
            return jsonify({"devis": []})
        devis = Devis.query.filter_by(societe_id=societe.id).all()
    elif role == "artisan":
        devis = Devis.query.filter_by(artisan_id=identity).all()
    else:
        return jsonify({"error": "Accès non autorisé"}), 403

    return jsonify([_devis_json(d) for d in devis])


@b2b_bp.route("/devis", methods=["POST"])
@jwt_required()
def create_devis():
    identity = get_jwt_identity()
    claims = get_jwt()
    role = claims.get("role", "")

    if role not in ("client", "artisan", "admin"):
        return jsonify({"error": "Accès non autorisé"}), 403

    data = request.get_json() or {}
    if role == "client":
        societe = Societe.query.filter_by(utilisateur_id=identity).first()
        if not societe:
            return jsonify({"error": "Créez d'abord votre société"}), 400
        societe_id = societe.id
        artisan_id = data.get("artisan_id")
    else:
        societe_id = data.get("societe_id")
        artisan_id = identity

    if not societe_id or not artisan_id:
        return jsonify({"error": "societe_id et artisan_id requis"}), 400

    lignes_data = data.get("lignes", [])
    if not lignes_data:
        return jsonify({"error": "Au moins une ligne requise"}), 400

    devis = Devis(
        id=str(uuid.uuid4()),
        numero=f"DEV-{int(datetime.now(timezone.utc).timestamp())}",
        societe_id=societe_id,
        artisan_id=artisan_id,
        notes=data.get("notes", ""),
        conditions=data.get("conditions", ""),
        remise=data.get("remise", 0),
        valable_jusqua=datetime.fromisoformat(data["valable_jusqua"]) if data.get("valable_jusqua") else None,
    )
    db.session.add(devis)
    db.session.flush()

    for ligne_data in lignes_data:
        ligne = LigneDevis(
            id=str(uuid.uuid4()),
            devis_id=devis.id,
            produit_id=ligne_data["produit_id"],
            variation_id=ligne_data.get("variation_id"),
            description=ligne_data.get("description", ""),
            quantite=ligne_data["quantite"],
            prix_unitaire=ligne_data["prix_unitaire"],
        )
        db.session.add(ligne)

    devis.calculer_montants()
    db.session.commit()

    return jsonify(_devis_json(devis)), 201


@b2b_bp.route("/devis/<devis_id>/send", methods=["PATCH"])
@jwt_required()
def send_devis(devis_id):
    devis = Devis.query.get(devis_id)
    if not devis:
        return jsonify({"error": "Devis introuvable"}), 404

    if devis.statut != "brouillon":
        return jsonify({"error": "Seuls les brouillons peuvent être envoyés"}), 400

    devis.statut = "envoye"
    devis.date_envoi = datetime.now(timezone.utc)
    db.session.commit()
    return jsonify({"message": "Devis envoyé"})


@b2b_bp.route("/devis/<devis_id>/accept", methods=["PATCH"])
@jwt_required()
def accept_devis(devis_id):
    devis = Devis.query.get(devis_id)
    if not devis:
        return jsonify({"error": "Devis introuvable"}), 404

    if devis.statut not in ("envoye", "negociation"):
        return jsonify({"error": "Ce devis ne peut pas être accepté"}), 400

    devis.statut = "accepte"
    devis.date_reponse = datetime.now(timezone.utc)
    db.session.commit()
    return jsonify({"message": "Devis accepté"})


@b2b_bp.route("/devis/<devis_id>/reject", methods=["PATCH"])
@jwt_required()
def reject_devis(devis_id):
    devis = Devis.query.get(devis_id)
    if not devis:
        return jsonify({"error": "Devis introuvable"}), 404

    devis.statut = "refuse"
    devis.date_reponse = datetime.now(timezone.utc)
    db.session.commit()
    return jsonify({"message": "Devis refusé"})


@b2b_bp.route("/devis/<devis_id>/negociate", methods=["PATCH"])
@jwt_required()
def negociate_devis(devis_id):
    devis = Devis.query.get(devis_id)
    if not devis:
        return jsonify({"error": "Devis introuvable"}), 404

    data = request.get_json() or {}
    devis.statut = "negociation"
    if "remise" in data:
        devis.remise = data["remise"]
    if "notes" in data:
        devis.notes = data["notes"]
    devis.calculer_montants()
    db.session.commit()
    return jsonify({"message": "Devis en négociation"})


# ----- Contrats -----

@b2b_bp.route("/contrats", methods=["GET"])
@jwt_required()
def list_contrats():
    identity = get_jwt_identity()
    claims = get_jwt()
    role = claims.get("role", "")

    if role in ("admin", "manager"):
        contrats = ContratFournisseur.query.all()
    elif role == "client":
        societe = Societe.query.filter_by(utilisateur_id=identity).first()
        if not societe:
            return jsonify({"contrats": []})
        contrats = ContratFournisseur.query.filter_by(societe_id=societe.id).all()
    elif role == "artisan":
        contrats = ContratFournisseur.query.filter_by(artisan_id=identity).all()
    else:
        return jsonify({"error": "Accès non autorisé"}), 403

    return jsonify([{
        "id": c.id, "numero": c.numero, "societe_id": c.societe_id,
        "artisan_id": c.artisan_id, "statut": c.statut,
        "date_debut": c.date_debut.isoformat() if c.date_debut else None,
        "date_fin": c.date_fin.isoformat() if c.date_fin else None,
        "reconduction_auto": c.reconduction_auto,
        "remise_negociee": str(c.remise_negociee),
        "signe_par_client": c.signe_par_client,
        "signe_par_artisan": c.signe_par_artisan,
        "est_signe": c.est_signe(),
        "est_actif": c.est_actif(),
    } for c in contrats])


@b2b_bp.route("/contrats", methods=["POST"])
@jwt_required()
def create_contrat():
    identity = get_jwt_identity()
    claims = get_jwt()
    role = claims.get("role", "")

    if role not in ("client", "artisan", "admin"):
        return jsonify({"error": "Accès non autorisé"}), 403

    data = request.get_json() or {}
    if not data.get("societe_id") or not data.get("artisan_id"):
        return jsonify({"error": "societe_id et artisan_id requis"}), 400
    if not data.get("date_debut") or not data.get("date_fin"):
        return jsonify({"error": "date_debut et date_fin requis"}), 400

    contrat = ContratFournisseur(
        id=str(uuid.uuid4()),
        numero=f"CTR-{int(datetime.now(timezone.utc).timestamp())}",
        societe_id=data["societe_id"],
        artisan_id=data["artisan_id"],
        date_debut=datetime.fromisoformat(data["date_debut"]),
        date_fin=datetime.fromisoformat(data["date_fin"]),
        reconduction_auto=data.get("reconduction_auto", False),
        conditions=data.get("conditions", ""),
        remise_negociee=data.get("remise_negociee", 0),
    )
    db.session.add(contrat)
    db.session.commit()

    return jsonify({
        "id": contrat.id, "numero": contrat.numero, "statut": contrat.statut,
    }), 201


@b2b_bp.route("/contrats/<contrat_id>/sign", methods=["PATCH"])
@jwt_required()
def sign_contrat(contrat_id):
    identity = get_jwt_identity()
    claims = get_jwt()
    role = claims.get("role", "")

    contrat = ContratFournisseur.query.get(contrat_id)
    if not contrat:
        return jsonify({"error": "Contrat introuvable"}), 404

    now = datetime.now(timezone.utc)

    if role == "client":
        societe = Societe.query.filter_by(utilisateur_id=identity).first()
        if not societe or societe.id != contrat.societe_id:
            return jsonify({"error": "Non autorisé"}), 403
        contrat.signe_par_client = True
        contrat.date_signature_client = now
    elif role == "artisan":
        if identity != contrat.artisan_id:
            return jsonify({"error": "Non autorisé"}), 403
        contrat.signe_par_artisan = True
        contrat.date_signature_artisan = now
    else:
        return jsonify({"error": "Seuls client et artisan peuvent signer"}), 403

    if contrat.signe_par_client and contrat.signe_par_artisan:
        contrat.statut = "actif"

    db.session.commit()
    return jsonify({"message": "Contrat signé"})


# ----- Helpers -----

def _societe_json(s):
    return {
        "id": s.id, "utilisateur_id": s.utilisateur_id,
        "nom": s.nom, "type_entreprise": s.type_entreprise,
        "nif": s.nif, "stat": s.stat,
        "adresse": s.adresse, "ville": s.ville, "pays": s.pays,
        "telephone": s.telephone, "site_web": s.site_web,
        "description": s.description, "secteur_activite": s.secteur_activite,
        "remise_globale": str(s.remise_globale),
        "statut": s.statut,
        "date_approbation": s.date_approbation.isoformat() if s.date_approbation else None,
        "date_creation": s.date_creation.isoformat() if s.date_creation else None,
    }


def _devis_json(d):
    return {
        "id": d.id, "numero": d.numero,
        "societe_id": d.societe_id, "artisan_id": d.artisan_id,
        "statut": d.statut,
        "montant_ht": str(d.montant_ht),
        "montant_ttc": str(d.montant_ttc),
        "remise": str(d.remise),
        "notes": d.notes, "conditions": d.conditions,
        "valable_jusqua": d.valable_jusqua.isoformat() if d.valable_jusqua else None,
        "date_envoi": d.date_envoi.isoformat() if d.date_envoi else None,
        "date_reponse": d.date_reponse.isoformat() if d.date_reponse else None,
        "date_creation": d.date_creation.isoformat() if d.date_creation else None,
        "lignes": [{
            "id": l.id, "produit_id": l.produit_id,
            "variation_id": l.variation_id,
            "description": l.description,
            "quantite": l.quantite,
            "prix_unitaire": str(l.prix_unitaire),
            "total_ht": str(l.total_ht),
        } for l in d.lignes],
    }
