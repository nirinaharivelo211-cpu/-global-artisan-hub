-- ============================================================
-- TISSAGE / E-ARTISAN — Schéma PostgreSQL complet
-- Généré à partir des requêtes du frontend TanStack (db.server.ts)
-- ============================================================

-- 0. Extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Type ENUM pour les rôles (étendu)
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('client', 'artisan', 'admin', 'manager', 'livreur');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- 2. UTILISATEURS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  password_hash TEXT,
  phone TEXT,
  country TEXT,
  city TEXT,
  region TEXT,
  language TEXT DEFAULT 'fr',
  currency TEXT DEFAULT 'EUR',
  description TEXT,
  avatar_url TEXT,
  is_active BOOLEAN DEFAULT true,
  suspendu_jusqua TIMESTAMPTZ,
  quota_quotidien INT DEFAULT 8,
  zone_livraison_id UUID,
  hub_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

CREATE TABLE IF NOT EXISTS public.sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  token TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Profils (compatibilité Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  full_name TEXT,
  avatar_url TEXT,
  phone TEXT,
  country TEXT,
  city TEXT,
  language TEXT DEFAULT 'fr',
  currency TEXT DEFAULT 'EUR',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Adresses
CREATE TABLE IF NOT EXISTS public.addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  label TEXT,
  full_name TEXT NOT NULL,
  phone TEXT,
  line1 TEXT NOT NULL,
  line2 TEXT,
  city TEXT NOT NULL,
  postal_code TEXT,
  country TEXT NOT NULL,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 3. PRODUITS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nom TEXT NOT NULL,
  description TEXT DEFAULT '',
  image TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  artisan TEXT NOT NULL,
  country TEXT NOT NULL,
  category TEXT NOT NULL,
  material TEXT NOT NULL,
  price NUMERIC(10,2) NOT NULL,
  rating NUMERIC(3,2) DEFAULT 0,
  reviews INT DEFAULT 0,
  image TEXT,
  fast_ship BOOLEAN DEFAULT false,
  fair_trade BOOLEAN DEFAULT false,
  certified BOOLEAN DEFAULT false,
  is_new BOOLEAN DEFAULT false,
  description TEXT,
  statut TEXT DEFAULT 'publie',
  user_id UUID REFERENCES public.users(id),
  suspendu_jusqua TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.product_variations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  couleur TEXT,
  couleur_nom TEXT,
  taille TEXT,
  type_mesure TEXT,
  poids NUMERIC(10,2) DEFAULT 0,
  prix NUMERIC(10,2) NOT NULL,
  stock INT DEFAULT 0,
  seuil_alerte INT DEFAULT 5,
  remise NUMERIC(5,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.product_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  image TEXT NOT NULL,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Artisans (vue simplifiée / cache)
CREATE TABLE IF NOT EXISTS public.artisans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  specialty TEXT,
  country TEXT NOT NULL,
  city TEXT NOT NULL,
  rating NUMERIC(3,2) DEFAULT 0,
  reviews INT DEFAULT 0,
  products INT DEFAULT 0,
  experience INT,
  certified BOOLEAN DEFAULT false,
  image TEXT
);

-- ============================================================
-- 4. PANIER & COMMANDES
-- ============================================================
CREATE TABLE IF NOT EXISTS public.cart_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  statut TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.cart_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  product_id UUID NOT NULL,
  product_name TEXT NOT NULL,
  product_image TEXT,
  artisan_name TEXT,
  unit_price NUMERIC(10,2) NOT NULL,
  quantity INT NOT NULL DEFAULT 1 CHECK (quantity > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  order_number TEXT UNIQUE DEFAULT ('TIS-' || upper(substr(gen_random_uuid()::text, 1, 8))),
  status TEXT NOT NULL DEFAULT 'pending',
  subtotal NUMERIC(10,2) NOT NULL DEFAULT 0,
  shipping NUMERIC(10,2) NOT NULL DEFAULT 0,
  total NUMERIC(10,2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'EUR',
  payment_method TEXT NOT NULL DEFAULT 'demo',
  shipping_address JSONB,
  carrier TEXT,
  region TEXT,
  tracking_number TEXT,
  date_confirmation TIMESTAMPTZ,
  date_preparation TIMESTAMPTZ,
  date_livraison TIMESTAMPTZ,
  reminder_sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL,
  product_name TEXT NOT NULL,
  product_image TEXT,
  artisan_name TEXT,
  unit_price NUMERIC(10,2) NOT NULL,
  quantity INT NOT NULL CHECK (quantity > 0),
  line_total NUMERIC(10,2) NOT NULL
);

-- ============================================================
-- 5. LIVRAISON & HUBS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.hubs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nom TEXT NOT NULL,
  region TEXT NOT NULL,
  ville TEXT NOT NULL,
  adresse TEXT,
  contact TEXT,
  telephone TEXT,
  gestionnaire_id UUID REFERENCES public.users(id),
  prix_par_km NUMERIC(10,2) DEFAULT 0,
  prix_par_kg NUMERIC(10,2) DEFAULT 0,
  actif BOOLEAN DEFAULT true,
  support_cod BOOLEAN DEFAULT false,
  mvola_number TEXT,
  orange_money_number TEXT,
  airtel_money_number TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.zones_livraison (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hub_id UUID NOT NULL REFERENCES public.hubs(id) ON DELETE CASCADE,
  nom TEXT NOT NULL,
  ville TEXT,
  distance_km NUMERIC(10,2),
  delai_estime_jours INT DEFAULT 3,
  actif BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Junction table livreurs <-> zones
CREATE TABLE IF NOT EXISTS public.utilisateurs_utilisateur_zones_livraison (
  utilisateur_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  zonelivraison_id UUID NOT NULL REFERENCES public.zones_livraison(id) ON DELETE CASCADE,
  PRIMARY KEY (utilisateur_id, zonelivraison_id)
);

CREATE TABLE IF NOT EXISTS public.livraisons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  livreur_id UUID REFERENCES public.users(id),
  hub_source_id UUID REFERENCES public.hubs(id),
  hub_destination_id UUID REFERENCES public.hubs(id),
  zone_livraison_id UUID REFERENCES public.zones_livraison(id),
  date_prevue TIMESTAMPTZ NOT NULL,
  date_reelle TIMESTAMPTZ,
  montant_du NUMERIC(10,2) NOT NULL DEFAULT 0,
  montant_encaisse NUMERIC(10,2),
  mode_paiement TEXT,
  statut_paiement TEXT DEFAULT 'pending',
  notes TEXT,
  date_creation TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Colis (dépôt collecte)
CREATE TABLE IF NOT EXISTS public.colis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  artisan_id UUID REFERENCES public.users(id),
  mode TEXT DEFAULT '',
  cooperative_nom TEXT DEFAULT '',
  lieu_depart TEXT DEFAULT '',
  statut TEXT,
  submitted_at TIMESTAMPTZ,
  collected_at TIMESTAMPTZ,
  collected_by TEXT,
  tracking_number TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 6. PAIEMENTS & REVERSEMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.factures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  numero_facture TEXT NOT NULL,
  qr_code TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.reversements_artisan (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  artisan_id UUID NOT NULL REFERENCES public.users(id),
  montant_brut NUMERIC(10,2) NOT NULL,
  commission NUMERIC(10,2) NOT NULL,
  montant_net NUMERIC(10,2) NOT NULL,
  statut TEXT DEFAULT 'pending',
  date_versement TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.demandes_paiement (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artisan_id UUID NOT NULL REFERENCES public.users(id),
  montant NUMERIC(10,2) NOT NULL,
  hub_id UUID REFERENCES public.hubs(id),
  mode_paiement_artisan TEXT DEFAULT '',
  reference_mm TEXT DEFAULT '',
  titulaire_mm TEXT DEFAULT '',
  statut TEXT NOT NULL DEFAULT 'pending',
  date_demande TIMESTAMPTZ NOT NULL DEFAULT now(),
  date_paiement TIMESTAMPTZ,
  reference_paiement TEXT DEFAULT ''
);

-- ============================================================
-- 7. NOTIFICATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  categorie TEXT NOT NULL DEFAULT 'systeme',
  type_notif TEXT NOT NULL DEFAULT 'info',
  titre TEXT NOT NULL,
  message TEXT DEFAULT '',
  lien TEXT,
  icone TEXT DEFAULT 'bell',
  couleur TEXT DEFAULT 'default',
  est_lu BOOLEAN DEFAULT false,
  date_lecture TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 8. AVIS & RÉSERVATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, product_id)
);

-- Workshops / Ateliers touristiques
CREATE TABLE IF NOT EXISTS public.workshops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  location TEXT NOT NULL,
  duration TEXT NOT NULL,
  price NUMERIC(10,2) NOT NULL,
  image TEXT,
  description TEXT NOT NULL,
  max_participants INT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  workshop_id UUID NOT NULL,
  workshop_title TEXT NOT NULL,
  workshop_location TEXT,
  workshop_image TEXT,
  booking_date DATE NOT NULL,
  participants INT NOT NULL CHECK (participants > 0),
  unit_price NUMERIC(10,2) NOT NULL,
  total NUMERIC(10,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'EUR',
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 9. ARTICLES / BLOG
-- ============================================================
CREATE TABLE IF NOT EXISTS public.articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT,
  excerpt TEXT,
  category TEXT,
  image TEXT,
  author TEXT,
  published_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 10. PROMOTIONS & B2B
-- ============================================================
CREATE TABLE IF NOT EXISTS public.promotions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  discount NUMERIC(10,2) NOT NULL,
  type TEXT NOT NULL DEFAULT 'percentage',
  uses INT DEFAULT 0,
  max_uses INT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, code)
);

CREATE TABLE IF NOT EXISTS public.b2b_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  company_name TEXT NOT NULL,
  siret TEXT NOT NULL,
  moq INT NOT NULL,
  volume_discount NUMERIC(5,2) NOT NULL,
  production_delay_days INT NOT NULL,
  incoterm_preferred TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category);
CREATE INDEX IF NOT EXISTS idx_products_user_id ON public.products(user_id);
CREATE INDEX IF NOT EXISTS idx_products_statut ON public.products(statut);
CREATE INDEX IF NOT EXISTS idx_product_variations_product_id ON public.product_variations(product_id);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON public.orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON public.order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_cart_items_user_id ON public.cart_items(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_est_lu ON public.notifications(est_lu);
CREATE INDEX IF NOT EXISTS idx_reviews_product_id ON public.reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_livraisons_order_id ON public.livraisons(order_id);
CREATE INDEX IF NOT EXISTS idx_livraisons_livreur_id ON public.livraisons(livreur_id);
CREATE INDEX IF NOT EXISTS idx_reversements_artisan_id ON public.reversements_artisan(artisan_id);
CREATE INDEX IF NOT EXISTS idx_demandes_paiement_artisan_id ON public.demandes_paiement(artisan_id);
CREATE INDEX IF NOT EXISTS idx_hubs_region ON public.hubs(region);
CREATE INDEX IF NOT EXISTS idx_hubs_actif ON public.hubs(actif);
CREATE INDEX IF NOT EXISTS idx_zones_livraison_hub_id ON public.zones_livraison(hub_id);

-- ============================================================
-- RLS (Row Level Security) — optionnel, applicable si Supabase
-- ============================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- FUNCTION: touch_updated_at
-- ============================================================
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ============================================================
-- FUNCTION: has_role
-- ============================================================
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- ============================================================
-- TRIGGER: on profiles
-- ============================================================
DROP TRIGGER IF EXISTS profiles_touch ON public.profiles;
CREATE TRIGGER profiles_touch BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
