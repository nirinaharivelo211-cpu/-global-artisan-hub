# TISSAGE — Artisan Marketplace

Plateforme de commerce en ligne pour les artisans malgaches, avec marketplace B2B et B2C.

## Quick Start

### Setup (one-time)

```bash
# Clone and navigate
git clone <repo>
cd global-artisan-hub-main

# Copy env template
cp .env.example .env

# Edit .env with your settings (API keys, database URL, etc.)
```

### Local Development (Docker)

Easiest way — use Docker Compose:

```bash
# Start all services (PostgreSQL, pgAdmin, backend, frontend)
npm run docker:up

# View logs
npm run docker:logs

# Stop services
npm run docker:down
```

Then visit:
- Frontend: http://localhost:3000
- API: http://localhost:8000/api
- pgAdmin: http://localhost:5050 (admin@tissage.com / admin_2026)

### Local Development (Manual)

If you prefer to run services manually:

**Backend (Flask):**
```bash
cd backend
pip install -r requirements.txt
python manage.py
# API → http://localhost:8000
```

**Frontend (TanStack Start):**
```bash
npm install
npm run dev
# App → http://localhost:3000
```

**Database:**
- Ensure PostgreSQL is running on localhost:5432 or update DATABASE_URL in `.env`

## Repository Structure

```
global-artisan-hub-main/
  backend/              # Flask API + Django apps (deprecated: see archive/)
    app/                # Flask factory and blueprints
    requirements.txt    # Python dependencies
    manage.py           # Flask development server
    wsgi.py             # Production WSGI
    migrations/         # Database migrations

  frontend/             # Client applications
    nextjs/             # Legacy Next.js (in transition)
    tanstack/           # Current TanStack Start app (React 19)
    components.json     # UI components registry

  infra/                # Infrastructure & deployments
    docker/             # Dockerfiles + docker-compose
      Dockerfile.backend
      Dockerfile.frontend
      Dockerfile.postgres
      docker-compose.yml        # Dev environment
      docker-compose.prod.yml   # Production
    scripts/            # Seeds, migrations, helper scripts
      init-db.sql
      seed.sql

  docs/                 # Developer documentation
    DEVELOPMENT.md      # Setup and troubleshooting
    RESTRUCTURE_PLAN.md # Migration history

  .env                  # Environment variables (not in git)
  .env.example          # Template (check this first!)
  package.json          # Root npm scripts
  vite.config.ts        # Vite build config (frontend)
  tsconfig.json         # TypeScript config
```

## Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React 19 (TanStack Start SSR), Vite 7, Tailwind CSS v4 |
| **Backend** | Flask 3.1, SQLAlchemy 2.0, Flask-JWT-Extended |
| **Database** | PostgreSQL (prod) / SQLite (dev) |
| **Payments** | Stripe + Flutterwave (Mobile Money) |
| **Auth** | JWT (backend) + AuthContext (frontend) |
| **Containerization** | Docker + Docker Compose |

## Features

- **Marketplace**: Artisans create/manage products, clients browse and purchase
- **Payments**: Stripe card payments + Flutterwave mobile money (Madagascar providers)
- **Orders**: Track orders from creation to delivery
- **Fulfillment**: Artisans fulfill orders, delivery agents ship via QR codes
- **Notifications**: Real-time order/payment updates
- **B2B (Experimental)**: Wholesale contracts and bulk orders

## Configuration

See `.env.example` for all available variables. Key ones:

```bash
# Database
DATABASE_URL=postgres://user:password@localhost:5432/tissage

# API
FLASK_ENV=development
FLASK_DEBUG=1

# Frontend
VITE_API_URL=http://localhost:8000/api

# Payments (test keys for development)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
FLW_SECRET_KEY=...
FLW_PUBLIC_KEY=...

# Auth
SUPABASE_URL=https://...
SUPABASE_PUBLISHABLE_KEY=...
```

## Development Workflow

1. **Create a branch**: `git checkout -b feature/my-feature`
2. **Make your changes**: edit code, test locally
3. **Commit**: `git commit -am "Clear message"`
4. **Push**: `git push origin feature/my-feature`
5. **Open PR**: describe changes and link issues

See [CONTRIBUTING.md](CONTRIBUTING.md) for detailed guidelines.

## Troubleshooting

### Docker containers failing to start?

```bash
# Check logs
npm run docker:logs

# Rebuild images
npm run docker:build

# Fresh start (warning: loses DB data)
docker volume rm <volume_name>
npm run docker:up
```

### Database migration issues?

```bash
cd backend
python manage.py db upgrade
python manage.py db downgrade
```

### Port already in use?

Edit `docker-compose.yml` or the relevant `.env` PORT variables and restart.

## Testing

Currently minimal test coverage. Contributions welcome!

```bash
# Backend tests (when added)
cd backend
pytest

# Frontend tests (when added)
npm run test
```

## Deployment

See [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) for deployment instructions (Azure, Vercel, etc.).

## License

Proprietary — TISSAGE 2026
