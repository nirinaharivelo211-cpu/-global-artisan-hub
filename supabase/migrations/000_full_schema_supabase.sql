-- =============================================================
-- TISSAGE — Schéma Supabase complet
-- Exécuter dans le SQL Editor de Supabase Dashboard
-- Projet: burxhtfbixlezyiiqwtl
-- =============================================================

-- 0. Extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================================
-- 1. TYPES ENUM
-- =============================================================
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('client', 'artisan', 'admin', 'manager', 'livreur');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.order_status AS ENUM ('pending', 'confirmed', 'awaiting_payment', 'paid', 'preparing', 'prete', 'shipped', 'in_delivery', 'delivered', 'cancelled', 'returned', 'echec');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.payment_method AS ENUM ('card', 'paypal', 'mvola', 'orange_money', 'airtel_money', 'cash_on_delivery', 'demo');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.booking_status AS ENUM ('pending', 'confirmed', 'cancelled', 'completed');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.cart_session_status AS ENUM ('active', 'converted', 'abandoned', 'expired');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.notification_category AS ENUM ('commande', 'livraison', 'paiement', 'produit', 'artisan', 'stock', 'avis', 'systeme', 'autre');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.colis_status AS ENUM ('preparing', 'deposited', 'dispatched', 'collected');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.paiement_status AS ENUM ('pending', 'paid', 'rejected');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- =============================================================
-- 2. UTILISATEURS
-- =============================================================
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  nom TEXT,
  prenom TEXT,
  avatar_url TEXT,
  phone TEXT,
  country TEXT,
  city TEXT,
  region TEXT,
  language TEXT DEFAULT 'fr',
  currency TEXT DEFAULT 'EUR',
  password_hash TEXT,
  email_verified BOOLEAN DEFAULT false,
  description TEXT,
  hub_id UUID,
  is_active BOOLEAN DEFAULT true,
  suspendu_jusqua TIMESTAMPTZ,
  suspension_motif TEXT DEFAULT '',
  quota_quotidien INT DEFAULT 8,
  zone_livraison_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);

-- =============================================================
-- 3. USER ROLES
-- =============================================================
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);

-- =============================================================
-- 4. FONCTIONS UTILITAIRES
-- =============================================================

-- has_role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- touch_updated_at
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

-- =============================================================
-- 5. TRIGGER: auto-create user + assign role on Supabase signup
-- =============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  chosen_role public.app_role;
BEGIN
  -- Create user in public.users with auth data
  INSERT INTO public.users (id, email, full_name, avatar_url, email_verified)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url',
    COALESCE(NEW.email_confirmed_at IS NOT NULL, false)
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, users.full_name),
    avatar_url = COALESCE(EXCLUDED.avatar_url, users.avatar_url);

  -- Assign role from metadata (never allow self-assigned admin)
  chosen_role := COALESCE(
    NULLIF(NEW.raw_user_meta_data->>'role', '')::public.app_role,
    'client'::public.app_role
  );
  IF chosen_role = 'admin' THEN chosen_role := 'client'; END IF;

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, chosen_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =============================================================
-- 6. TRIGGERS updated_at
-- =============================================================
DROP TRIGGER IF EXISTS users_touch ON public.users;
CREATE TRIGGER users_touch BEFORE UPDATE ON public.users
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- =============================================================
-- 7. HUBS & ZONES
-- =============================================================
CREATE TABLE IF NOT EXISTS public.hubs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nom TEXT NOT NULL,
  region TEXT NOT NULL,
  ville TEXT NOT NULL,
  adresse TEXT DEFAULT '',
  contact TEXT DEFAULT '',
  telephone TEXT DEFAULT '',
  regions_servees JSONB DEFAULT '[]'::jsonb,
  support_cod BOOLEAN DEFAULT true,
  mm_account_holder TEXT DEFAULT '',
  mvola_number TEXT DEFAULT '',
  airtel_money_number TEXT DEFAULT '',
  orange_money_number TEXT DEFAULT '',
  prix_par_km NUMERIC(10,2) DEFAULT 0,
  prix_par_kg NUMERIC(10,2) DEFAULT 0,
  delai_defaut_jours INT DEFAULT 5,
  quota_quotidien_defaut INT DEFAULT 15,
  gestionnaire_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  actif BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_hubs_region ON public.hubs(region);

CREATE TABLE IF NOT EXISTS public.zones_livraison (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hub_id UUID NOT NULL REFERENCES public.hubs(id) ON DELETE CASCADE,
  nom TEXT NOT NULL,
  ville TEXT DEFAULT '',
  distance_km NUMERIC(8,2),
  delai_estime_jours INT DEFAULT 3,
  actif BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (hub_id, nom)
);
CREATE INDEX IF NOT EXISTS idx_zones_livraison_hub ON public.zones_livraison(hub_id);

CREATE TABLE IF NOT EXISTS public.utilisateurs_utilisateur_zones_livraison (
  utilisateur_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  zonelivraison_id UUID NOT NULL REFERENCES public.zones_livraison(id) ON DELETE CASCADE,
  PRIMARY KEY (utilisateur_id, zonelivraison_id)
);

-- =============================================================
-- 8. CATEGORIES & PRODUCTS
-- =============================================================
CREATE TABLE IF NOT EXISTS public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nom TEXT NOT NULL,
  description TEXT DEFAULT '',
  image TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.products (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  artisan TEXT NOT NULL,
  country TEXT NOT NULL,
  category TEXT NOT NULL,
  material TEXT NOT NULL,
  description TEXT DEFAULT '',
  price NUMERIC(10,2) NOT NULL,
  poids NUMERIC(10,3),
  rating NUMERIC(3,2) NOT NULL DEFAULT 0,
  reviews INT NOT NULL DEFAULT 0,
  image TEXT,
  fast_ship BOOLEAN DEFAULT false,
  fair_trade BOOLEAN DEFAULT false,
  certified BOOLEAN DEFAULT false,
  is_new BOOLEAN DEFAULT false,
  statut TEXT DEFAULT 'publie',
  suspendu_jusqua TIMESTAMPTZ,
  suspension_motif TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category);
CREATE INDEX IF NOT EXISTS idx_products_user_id ON public.products(user_id);
CREATE INDEX IF NOT EXISTS idx_products_statut ON public.products(statut);

CREATE TABLE IF NOT EXISTS public.product_variations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id TEXT NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  couleur TEXT,
  couleur_nom TEXT,
  taille TEXT,
  type_mesure TEXT,
  poids NUMERIC(10,2) DEFAULT 0,
  prix NUMERIC(10,2) NOT NULL,
  stock INT DEFAULT 0,
  seuil_alerte INT DEFAULT 5,
  remise NUMERIC(5,2),
  image TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_product_variations_product ON public.product_variations(product_id);

CREATE TABLE IF NOT EXISTS public.product_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id TEXT NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  image TEXT NOT NULL,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_product_images_product ON public.product_images(product_id);

-- =============================================================
-- 9. ARTISANS
-- =============================================================
CREATE TABLE IF NOT EXISTS public.artisans (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  specialty TEXT NOT NULL,
  country TEXT NOT NULL,
  city TEXT NOT NULL,
  rating NUMERIC(3,2) NOT NULL DEFAULT 0,
  reviews INT NOT NULL DEFAULT 0,
  products INT NOT NULL DEFAULT 0,
  experience INT NOT NULL DEFAULT 0,
  certified BOOLEAN DEFAULT false,
  image TEXT,
  bio TEXT,
  adresse TEXT DEFAULT '',
  telephone TEXT DEFAULT '',
  email_contact TEXT DEFAULT '',
  site_web TEXT DEFAULT '',
  photo_couverture TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================================
-- 10. WORKSHOPS
-- =============================================================
CREATE TABLE IF NOT EXISTS public.workshops (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  location TEXT NOT NULL,
  duration TEXT NOT NULL,
  price NUMERIC(10,2) NOT NULL,
  image TEXT,
  description TEXT,
  max_participants INT NOT NULL DEFAULT 8,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================================
-- 11. CART
-- =============================================================
CREATE TABLE IF NOT EXISTS public.cart_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  statut public.cart_session_status NOT NULL DEFAULT 'active',
  date_expiration TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_cart_sessions_user ON public.cart_sessions(user_id);
DROP TRIGGER IF EXISTS cart_sessions_touch ON public.cart_sessions;
CREATE TRIGGER cart_sessions_touch BEFORE UPDATE ON public.cart_sessions
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE IF NOT EXISTS public.cart_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cart_session_id UUID REFERENCES public.cart_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  product_name TEXT NOT NULL,
  product_image TEXT,
  artisan_name TEXT,
  variation_id UUID REFERENCES public.product_variations(id) ON DELETE SET NULL,
  unit_price NUMERIC(10,2) NOT NULL,
  quantity INT NOT NULL DEFAULT 1 CHECK (quantity > 0),
  snapshot_couleur TEXT DEFAULT '',
  snapshot_taille TEXT DEFAULT '',
  snapshot_poids NUMERIC(10,2),
  fulfillment_status TEXT DEFAULT '',
  fulfillment_quantity INT,
  expedition_mode TEXT DEFAULT '',
  expedition_cooperative TEXT DEFAULT '',
  expedition_numero_colis TEXT DEFAULT '',
  colis_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, product_id)
);
CREATE INDEX IF NOT EXISTS idx_cart_items_user_id ON public.cart_items(user_id);
DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_cart_items_session ON public.cart_items(cart_session_id);
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- =============================================================
-- 12. ORDERS
-- =============================================================
CREATE TABLE IF NOT EXISTS public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  order_number TEXT NOT NULL UNIQUE DEFAULT ('TIS-' || upper(substr(gen_random_uuid()::text, 1, 8))),
  status public.order_status NOT NULL DEFAULT 'pending',
  subtotal NUMERIC(10,2) NOT NULL,
  shipping NUMERIC(10,2) NOT NULL DEFAULT 0,
  total NUMERIC(10,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'EUR',
  payment_method public.payment_method NOT NULL DEFAULT 'demo',
  carrier TEXT,
  tracking_number TEXT,
  shipping_address JSONB NOT NULL,
  cart_session_id UUID,
  hub_source_id UUID REFERENCES public.hubs(id) ON DELETE SET NULL,
  hub_destination_id UUID REFERENCES public.hubs(id) ON DELETE SET NULL,
  zone_livraison_id UUID REFERENCES public.zones_livraison(id) ON DELETE SET NULL,
  qr_code TEXT,
  notes TEXT DEFAULT '',
  mobile_money_provider TEXT DEFAULT '',
  mobile_money_ref TEXT DEFAULT '',
  auto_cancel_at TIMESTAMPTZ,
  reminder_sent_at TIMESTAMPTZ,
  date_confirmation TIMESTAMPTZ,
  date_preparation TIMESTAMPTZ,
  date_livraison TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON public.orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
DROP TRIGGER IF EXISTS orders_touch ON public.orders;
CREATE TRIGGER orders_touch BEFORE UPDATE ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE IF NOT EXISTS public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL,
  product_name TEXT NOT NULL,
  product_image TEXT,
  artisan_name TEXT,
  variation_id UUID REFERENCES public.product_variations(id) ON DELETE SET NULL,
  unit_price NUMERIC(10,2) NOT NULL,
  quantity INT NOT NULL CHECK (quantity > 0),
  line_total NUMERIC(10,2) NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON public.order_items(order_id);

-- =============================================================
-- 13. COLIS
-- =============================================================
CREATE TABLE IF NOT EXISTS public.colis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  uuid TEXT UNIQUE NOT NULL DEFAULT gen_random_uuid()::text,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  artisan_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  statut public.colis_status NOT NULL DEFAULT 'preparing',
  mode TEXT DEFAULT '',
  numero_colis TEXT DEFAULT '',
  cooperative_nom TEXT DEFAULT '',
  lieu_depart TEXT DEFAULT '',
  qr_code TEXT DEFAULT '',
  submitted_at TIMESTAMPTZ,
  collected_at TIMESTAMPTZ,
  collected_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_colis_order ON public.colis(order_id);
DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_colis_uuid ON public.colis(uuid);
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- =============================================================
-- 14. LIVRAISONS
-- =============================================================
CREATE TABLE IF NOT EXISTS public.livraisons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  livreur_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  hub_source_id UUID REFERENCES public.hubs(id) ON DELETE SET NULL,
  hub_destination_id UUID REFERENCES public.hubs(id) ON DELETE SET NULL,
  zone_livraison_id UUID REFERENCES public.zones_livraison(id) ON DELETE SET NULL,
  cooperative_nom TEXT DEFAULT '',
  cooperative_numero_suivi TEXT DEFAULT '',
  date_prevue TIMESTAMPTZ NOT NULL DEFAULT now(),
  date_reelle TIMESTAMPTZ,
  shipped_at TIMESTAMPTZ,
  montant_du NUMERIC(10,2) NOT NULL DEFAULT 0,
  montant_encaisse NUMERIC(10,2),
  mode_paiement TEXT DEFAULT '',
  statut_paiement TEXT DEFAULT 'non_paye',
  qr_code TEXT,
  notes TEXT DEFAULT '',
  commentaires TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_livraisons_order ON public.livraisons(order_id);
CREATE INDEX IF NOT EXISTS idx_livraisons_livreur ON public.livraisons(livreur_id);
DROP TRIGGER IF EXISTS livraisons_touch ON public.livraisons;
CREATE TRIGGER livraisons_touch BEFORE UPDATE ON public.livraisons
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- =============================================================
-- 15. FACTURES
-- =============================================================
CREATE TABLE IF NOT EXISTS public.factures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  numero_facture TEXT NOT NULL UNIQUE,
  statut TEXT NOT NULL DEFAULT 'awaiting_payment',
  qr_code TEXT DEFAULT '',
  date_emission TIMESTAMPTZ NOT NULL DEFAULT now(),
  date_paiement TIMESTAMPTZ,
  date_livraison TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_factures_order ON public.factures(order_id);

-- =============================================================
-- 16. REVERSEMENTS & DEMANDES PAIEMENT
-- =============================================================
CREATE TABLE IF NOT EXISTS public.reversements_artisan (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  artisan_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  montant_brut NUMERIC(10,2) NOT NULL,
  commission NUMERIC(10,2) NOT NULL DEFAULT 0,
  montant_net NUMERIC(10,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_reversements_artisan ON public.reversements_artisan(artisan_id);

CREATE TABLE IF NOT EXISTS public.demandes_paiement (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artisan_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  hub_id UUID REFERENCES public.hubs(id) ON DELETE SET NULL,
  montant NUMERIC(10,2) NOT NULL,
  statut public.paiement_status NOT NULL DEFAULT 'pending',
  mode_paiement_artisan TEXT DEFAULT '',
  reference_mm TEXT DEFAULT '',
  titulaire_mm TEXT DEFAULT '',
  reference_paiement TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  date_demande TIMESTAMPTZ NOT NULL DEFAULT now(),
  date_paiement TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_demandes_paiement_artisan ON public.demandes_paiement(artisan_id);

-- =============================================================
-- 17. NOTIFICATIONS
-- =============================================================
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  categorie public.notification_category NOT NULL DEFAULT 'autre',
  type_notif TEXT NOT NULL DEFAULT 'autre',
  titre TEXT NOT NULL,
  message TEXT NOT NULL DEFAULT '',
  lien TEXT,
  icone TEXT DEFAULT 'bell',
  couleur TEXT DEFAULT 'default',
  est_lu BOOLEAN NOT NULL DEFAULT false,
  date_lecture TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON public.notifications(user_id, est_lu);

-- =============================================================
-- 18. ADDRESSES
-- =============================================================
CREATE TABLE IF NOT EXISTS public.addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  label TEXT,
  full_name TEXT NOT NULL,
  phone TEXT,
  line1 TEXT NOT NULL,
  line2 TEXT,
  city TEXT NOT NULL,
  region TEXT DEFAULT '',
  postal_code TEXT,
  country TEXT NOT NULL,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_addresses_user_id ON public.addresses(user_id);

-- =============================================================
-- 19. BOOKINGS & REVIEWS
-- =============================================================
CREATE TABLE IF NOT EXISTS public.bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  workshop_id TEXT NOT NULL REFERENCES public.workshops(id) ON DELETE CASCADE,
  workshop_title TEXT NOT NULL,
  workshop_location TEXT,
  workshop_image TEXT,
  booking_date DATE NOT NULL,
  participants INT NOT NULL DEFAULT 1 CHECK (participants > 0),
  unit_price NUMERIC(10,2) NOT NULL,
  total NUMERIC(10,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'EUR',
  status public.booking_status NOT NULL DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_bookings_user_id ON public.bookings(user_id);

CREATE TABLE IF NOT EXISTS public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, product_id)
);
CREATE INDEX IF NOT EXISTS idx_reviews_product_id ON public.reviews(product_id);

-- =============================================================
-- 20. SESSIONS (local auth fallback)
-- =============================================================
CREATE TABLE IF NOT EXISTS public.sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON public.sessions(token);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON public.sessions(user_id);

-- =============================================================
-- 21. ARTICLES / BLOG
-- =============================================================
CREATE TABLE IF NOT EXISTS public.articles (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  category TEXT NOT NULL,
  excerpt TEXT,
  content TEXT,
  image TEXT,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
DROP TRIGGER IF EXISTS articles_touch ON public.articles;
CREATE TRIGGER articles_touch BEFORE UPDATE ON public.articles
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- =============================================================
-- 22. PROMOTIONS & B2B
-- =============================================================
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

-- =============================================================
-- 23. CLEAN SESSIONS FUNCTION
-- =============================================================
CREATE OR REPLACE FUNCTION public.clean_expired_sessions()
RETURNS void
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM public.sessions WHERE expires_at < now()
$$;

-- =============================================================
-- 24. RLS (Row Level Security)
-- =============================================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cart_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

-- Users: everyone can read, users can update their own
CREATE POLICY "Users are viewable by everyone" ON public.users FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.users FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Service role manages users" ON public.user_roles FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- User roles
CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);

-- Cart
CREATE POLICY "Users manage their cart" ON public.cart_items FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users manage their cart sessions" ON public.cart_sessions FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Orders
CREATE POLICY "Users see own orders" ON public.orders FOR SELECT USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users create own orders" ON public.orders FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins update orders" ON public.orders FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));

-- Order items
CREATE POLICY "Users see own order items" ON public.order_items FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND (o.user_id = auth.uid() OR public.has_role(auth.uid(), 'admin')))
);
CREATE POLICY "Users insert items in own orders" ON public.order_items FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND o.user_id = auth.uid())
);

-- Notifications
CREATE POLICY "Users see own notifications" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users update own notifications" ON public.notifications FOR UPDATE USING (auth.uid() = user_id);

-- Addresses
CREATE POLICY "Users manage their addresses" ON public.addresses FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Reviews
CREATE POLICY "Reviews are public" ON public.reviews FOR SELECT USING (true);
CREATE POLICY "Users post reviews" ON public.reviews FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users edit reviews" ON public.reviews FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete reviews" ON public.reviews FOR DELETE USING (auth.uid() = user_id);

-- Bookings
CREATE POLICY "Users manage own bookings" ON public.bookings FOR ALL USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin')) WITH CHECK (auth.uid() = user_id);

-- =============================================================
-- 25. GRANTS (service_role full access)
-- =============================================================
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO service_role;

-- Authenticated users get read/write on their own data
GRANT SELECT ON public.users TO authenticated;
GRANT UPDATE ON public.users TO authenticated;
GRANT SELECT ON public.user_roles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cart_items TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cart_sessions TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.orders TO authenticated;
GRANT SELECT, INSERT ON public.order_items TO authenticated;
GRANT SELECT, UPDATE ON public.notifications TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.addresses TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reviews TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bookings TO authenticated;

-- Anon can read public data
GRANT SELECT ON public.users TO anon;
GRANT SELECT ON public.products TO anon;
GRANT SELECT ON public.categories TO anon;
GRANT SELECT ON public.artisans TO anon;
GRANT SELECT ON public.workshops TO anon;
GRANT SELECT ON public.articles TO anon;
GRANT SELECT ON public.reviews TO anon;

-- =============================================================
-- DONE! Schema is ready for TISSAGE app
-- =============================================================
