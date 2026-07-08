# Development Guide

## Table of Contents

- [Local Setup](#local-setup)
- [Running the Application](#running-the-application)
- [Database](#database)
- [Environment Variables](#environment-variables)
- [Debugging](#debugging)
- [Troubleshooting](#troubleshooting)

## Local Setup

### Prerequisites

- **Node.js**: v22+ (check: `node --version`)
- **Python**: 3.11+ (check: `python --version`)
- **Docker** (optional, but recommended for database)
- **Git**: latest version

### Step 1: Clone & Install Dependencies

```bash
git clone <repo>
cd global-artisan-hub-main

# Copy environment template
cp .env.example .env

# Install Node dependencies
npm install

# (Optional) Create Python virtualenv and install backend deps
cd backend
python -m venv venv
source ./venv/Scripts/Activate.ps1  # Windows PowerShell
# or: source ./venv/bin/activate    # macOS/Linux
pip install -r requirements.txt
cd ..
```

### Step 2: Configure `.env`

Edit `.env` and set:

```bash
# Database (use Docker or local PostgreSQL)
DATABASE_URL=postgres://tissage:tissage_dev_2026@localhost:5432/tissage

# API
FLASK_ENV=development
FLASK_DEBUG=1

# Frontend
VITE_API_URL=http://localhost:8000/api

# Payments (use test keys from Stripe/Flutterwave dashboards)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
FLW_SECRET_KEY=...
FLW_PUBLIC_KEY=...

# Auth (Supabase, optional for frontend)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_PUBLISHABLE_KEY=...
```

## Running the Application

### Option 1: Docker (Recommended for Dev)

All services in one command:

```bash
npm run docker:up
```

Services start:
- **Frontend** at http://localhost:3000
- **Backend** at http://localhost:8000
- **PostgreSQL** at localhost:5432
- **pgAdmin** at http://localhost:5050 (admin@tissage.com / admin_2026)

**View logs:**
```bash
npm run docker:logs
```

**Stop services:**
```bash
npm run docker:down
```

### Option 2: Manual (Frontend Only)

Use Docker for database, run frontend manually:

```bash
# Start only database
docker-compose -f infra/docker/docker-compose.yml up postgres -d

# In one terminal: Backend
cd backend
python manage.py

# In another terminal: Frontend
npm run dev
```

### Option 3: Fully Manual

If you have PostgreSQL running locally on port 5432:

**Terminal 1 (Backend):**
```bash
cd backend
python manage.py
# Listens on http://localhost:8000
```

**Terminal 2 (Frontend):**
```bash
npm run dev
# Listens on http://localhost:3000
```

## Database

### Migrations

```bash
cd backend

# Create a new migration (after changing models)
python manage.py db migrate

# Apply pending migrations
python manage.py db upgrade

# Rollback last migration
python manage.py db downgrade

# See migration history
python manage.py db history
```

### Seeding Data

If `infra/scripts/seed.sql` exists, it runs automatically on first `docker-compose up`.

To manually seed:

```bash
psql postgresql://tissage:tissage_dev_2026@localhost:5432/tissage < infra/scripts/seed.sql
```

### Connecting pgAdmin

1. Visit http://localhost:5050
2. Login: **admin@tissage.com** / **admin_2026**
3. Add server:
   - Host: `postgres` (or `localhost` if running manually)
   - Port: `5432`
   - Username: `tissage`
   - Password: `tissage_dev_2026`
   - Database: `tissage`

## Environment Variables

### Key Variables

| Variable | Example | Notes |
|----------|---------|-------|
| `DATABASE_URL` | `postgres://...` | Required for backend |
| `FLASK_ENV` | `development` | Use `production` in deploy |
| `VITE_API_URL` | `http://localhost:8000/api` | Frontend API endpoint |
| `STRIPE_SECRET_KEY` | `sk_test_...` | Get from Stripe dashboard |
| `FLW_SECRET_KEY` | `FLWSECK-...` | Flutterwave secret |

### Development Defaults

In development, most variables can remain empty. Backend will use sensible defaults:

```bash
# These default if not set:
STRIPE_SECRET_KEY=        # Card payments disabled
STRIPE_PUBLISHABLE_KEY=   # Card payments disabled
FLW_SECRET_KEY=           # Flutterwave disabled
FLW_PUBLIC_KEY=           # Flutterwave disabled
SUPABASE_URL=             # Auth disabled (use mock user)
SUPABASE_PUBLISHABLE_KEY= # Auth disabled
```

### Test Keys (for development)

Stripe:
- Secret: `sk_test_51234...`
- Publishable: `pk_test_51234...`
- (Get from https://dashboard.stripe.com/test/apikeys)

Flutterwave:
- (Get from https://dashboard.flutterwave.com)

## Debugging

### Backend Logs

```bash
# In Docker
npm run docker:logs backend

# Manual Flask
# Logs print to terminal automatically (FLASK_DEBUG=1)
```

### Frontend Logs

```bash
# Browser console (Ctrl+Shift+J or Cmd+Option+J)
# Print logs there

# Terminal
npm run dev
# Vite logs to terminal
```

### Database Queries

```bash
# Enable query logging in backend (already set by FLASK_DEBUG=1)
# See SQL in Flask logs

# Or query directly with psql
psql postgresql://tissage:tissage_dev_2026@localhost:5432/tissage
```

### API Testing

Use Postman, curl, or VS Code REST Client:

```bash
# Get products
curl http://localhost:8000/api/produits

# Create product (requires auth token)
curl -X POST http://localhost:8000/api/produits \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"nom":"...", "prix":100, ...}'
```

## Troubleshooting

### Docker Issues

**Containers won't start:**
```bash
docker-compose -f infra/docker/docker-compose.yml logs
```

**Port already in use:**
```bash
# Find and kill process using port 3000
lsof -ti:3000 | xargs kill -9   # macOS/Linux
Get-Process -Id (Get-NetTCPConnection -LocalPort 3000).OwningProcess | Stop-Process  # Windows
```

Or change port in `.env` and docker-compose.

**Fresh start (loses DB)**:
```bash
npm run docker:down
docker volume rm <volume_name>  # See: docker volume ls
npm run docker:up
```

### Backend Issues

**"ModuleNotFoundError":**
```bash
cd backend
pip install -r requirements.txt
```

**Database connection error:**
```bash
# Check DATABASE_URL in .env
# Test connection:
psql $DATABASE_URL
```

**Port 8000 in use:**
```bash
# Change port in manage.py or .env and restart
```

### Frontend Issues

**"Cannot find module":**
```bash
# Reinstall and clear cache
rm -rf node_modules package-lock.json
npm install
```

**Vite not refreshing changes:**
```bash
# Kill dev server (Ctrl+C)
npm run dev
```

**API calls return 404:**
```bash
# Check VITE_API_URL in .env matches backend port (default 8000)
# Check backend is running: curl http://localhost:8000/api/health
```

### Database Issues

**Migration conflicts:**
```bash
cd backend

# See current schema
python manage.py db current

# Resolve conflict (usually requires manual edit to migration file)
python manage.py db downgrade
python manage.py db upgrade
```

**Seed failed:**
```bash
# Re-seed manually
psql postgresql://... < infra/scripts/seed.sql

# Or from Docker
docker exec tissage-db psql -U tissage -d tissage -f /docker-entrypoint-initdb.d/02-seed.sql
```

## Performance Tips

1. **Docker builds slow?** Rebuild and cache: `npm run docker:build`
2. **Frontend slow?** Clear browser cache (Cmd+Shift+Delete or Ctrl+Shift+Delete)
3. **Database slow?** Check indexes: `SELECT * FROM pg_indexes WHERE tablename = 'produits';`

## Next Steps

- Read [CONTRIBUTING.md](../CONTRIBUTING.md) for code style and PR guidelines
- Check [../README.md](../README.md) for architecture overview
- See backend `README.md` for Flask API docs
- See `infra/docker/` for deployment configurations

