# TISSAGE — API Flask

Application backend Flask pour la plateforme TISSAGE (marketplace artisanal malgache).

## Structure

```
backend/
  app/
    __init__.py       # App factory
    config.py         # Configuration (dev/prod/test)
    extensions.py     # Flask extensions (SQLAlchemy, JWT, CORS, etc.)
    models/           # SQLAlchemy models
      utilisateur.py
      produit.py
      commande.py
      livraison.py
      notification.py
      b2b.py
    api/              # Blueprints API REST
      auth.py         # Auth (register, login, refresh, me)
      utilisateurs.py
      produits.py
      commandes.py
      paiements.py    # Stripe + Flutterwave
      livraisons.py
      notifications.py
      b2b.py          # B2B marketplace
    webhooks/         # Paiement webhooks
      stripe.py
      flutterwave.py
    admin/            # Flask-Admin
    tasks.py          # Celery tasks (async + periodic)
    utils.py          # Utility functions
  wsgi.py             # WSGI entry point
  manage.py           # Development runner
  requirements.txt
```

## Installation

```bash
cd backend
pip install -r requirements.txt
```

## Développement

```bash
cd backend
python manage.py
# API → http://localhost:8000/api
```

## Production

```bash
cd backend
gunicorn wsgi:app -w 4 -b 0.0.0.0:8000
```

## API Endpoints

### Auth
- `POST /api/auth/register` — Créer un compte
- `POST /api/auth/login` — Connexion (reçoit JWT)
- `POST /api/auth/refresh` — Rafraîchir le token
- `GET /api/auth/me` — Profil connecté

### Produits
- `GET /api/produits` — Liste des produits
- `GET /api/produits/<id>` — Détail produit
- `POST /api/produits` — Créer un produit (artisan)
- `GET /api/produits/categories` — Catégories

### Commandes
- `GET /api/commandes/cart` — Mon panier
- `POST /api/commandes/cart/add` — Ajouter au panier
- `POST /api/commandes/checkout` — Valider la commande
- `GET /api/commandes/orders` — Mes commandes

### Paiements
- `POST /api/paiements/stripe/create-intent` — Stripe
- `POST /api/paiements/flutterwave/create` — Flutterwave
- `GET /api/paiements/transactions` — Transactions

### B2B
- `POST /api/b2b/societes` — Créer société
- `GET /api/b2b/catalogue` — Catalogue pro
- `POST /api/b2b/devis` — Créer un devis
- `POST /api/b2b/contrats` — Créer un contrat

### Webhooks
- `POST /api/webhooks/stripe` — Stripe events
- `POST /api/webhooks/flutterwave` — Flutterwave events
