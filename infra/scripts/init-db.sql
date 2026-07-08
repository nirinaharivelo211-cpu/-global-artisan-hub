-- =============================================================
-- TISSAGE — Initialisation de la base de données PostgreSQL
-- Adapté depuis les migrations Supabase pour standalone PostgreSQL
-- Intègre les modules de eartisan: hubs, livraisons, notifications,
-- colis, variations produits, paiements artisans
-- =============================================================

-- 1. Enums
CREATE TYPE public.app_role AS ENUM ('client', 'artisan', 'admin', 'manager', 'livreur');
CREATE TYPE public.order_status AS ENUM ('pending', 'confirmed', 'awaiting_payment', 'paid', 'preparing', 'prete', 'shipped', 'in_delivery', 'delivered', 'cancelled', 'returned', 'echec');
CREATE TYPE public.payment_method AS ENUM ('card', 'paypal', 'mvola', 'orange_money', 'airtel_money', 'cash_on_delivery', 'demo');
CREATE TYPE public.booking_status AS ENUM ('pending', 'confirmed', 'cancelled', 'completed');
CREATE TYPE public.cart_session_status AS ENUM ('active', 'converted', 'abandoned', 'expired');
CREATE TYPE public.notification_category AS ENUM ('commande', 'livraison', 'paiement', 'produit', 'artisan', 'stock', 'avis', 'systeme', 'autre');
CREATE TYPE public.colis_status AS ENUM ('preparing', 'deposited', 'dispatched', 'collected');
CREATE TYPE public.paiement_status AS ENUM ('pending', 'paid', 'rejected');

-- 2. Users table enrichie (avec hub, région, suspension)
CREATE TABLE public.users (
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
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_users_email ON public.users(email);

-- 3. User roles (enrichi avec manager + livreur)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
CREATE INDEX idx_user_roles_user_id ON public.user_roles(user_id);

-- 4. Has role function
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- 5. Trigger updated_at
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER users_touch BEFORE UPDATE ON public.users
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 6. Trigger: auto-assign 'client' role on user insert
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'client');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_user_created
AFTER INSERT ON public.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 7. Hubs régionaux (from eartisan livraisons)
CREATE TABLE public.hubs (
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
CREATE INDEX idx_hubs_region ON public.hubs(region);

-- 8. Zones de livraison (rattachées à un hub)
CREATE TABLE public.zones_livraison (
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
CREATE INDEX idx_zones_livraison_hub ON public.zones_livraison(hub_id);

-- 9. Categories (produits)
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nom TEXT NOT NULL,
  description TEXT DEFAULT '',
  image TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 10. Products (enrichi avec user_id, statut, suspension)
CREATE TABLE public.products (
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

-- 11. Product variations (couleur, taille, stock, remise)
CREATE TABLE public.product_variations (
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
CREATE INDEX idx_product_variations_product ON public.product_variations(product_id);

-- 12. Product images (multiples images par produit)
CREATE TABLE public.product_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id TEXT NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  image TEXT NOT NULL,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_product_images_product ON public.product_images(product_id);

-- 13. Artisans (table persistante)
CREATE TABLE public.artisans (
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
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 14. Workshops (ateliers touristiques)
CREATE TABLE public.workshops (
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

-- 15. Cart sessions (with status tracking)
CREATE TABLE public.cart_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  statut public.cart_session_status NOT NULL DEFAULT 'active',
  date_expiration TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_cart_sessions_user ON public.cart_sessions(user_id);
CREATE INDEX idx_cart_sessions_status ON public.cart_sessions(statut);

CREATE TRIGGER cart_sessions_touch BEFORE UPDATE ON public.cart_sessions
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 16. Cart items (enrichi avec snapshots, fulfillment, colis)
CREATE TABLE public.cart_items (
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
  -- Snapshots au checkout
  snapshot_couleur TEXT DEFAULT '',
  snapshot_taille TEXT DEFAULT '',
  snapshot_poids NUMERIC(10,2),
  -- Fulfillment tracking
  fulfillment_status TEXT DEFAULT '',
  fulfillment_quantity INT,
  expedition_mode TEXT DEFAULT '',
  expedition_cooperative TEXT DEFAULT '',
  expedition_numero_colis TEXT DEFAULT '',
  colis_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, product_id)
);
CREATE INDEX idx_cart_items_user_id ON public.cart_items(user_id);
CREATE INDEX idx_cart_items_session ON public.cart_items(cart_session_id);

-- 17. Orders (enrichi avec statuts étendus, hub, validation, paiement)
CREATE TABLE public.orders (
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
  -- Enrichissements eartisan
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
CREATE INDEX idx_orders_user_id ON public.orders(user_id);
CREATE INDEX idx_orders_status ON public.orders(status);

CREATE TRIGGER orders_touch BEFORE UPDATE ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 18. Order items (enrichi avec variation_id)
CREATE TABLE public.order_items (
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
CREATE INDEX idx_order_items_order_id ON public.order_items(order_id);

-- 19. Colis (parcels with QR code tracking)
CREATE TABLE public.colis (
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
CREATE INDEX idx_colis_order ON public.colis(order_id);
CREATE INDEX idx_colis_uuid ON public.colis(uuid);

-- 20. Livraisons (delivery tracking with payment)
CREATE TABLE public.livraisons (
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
CREATE INDEX idx_livraisons_order ON public.livraisons(order_id);
CREATE INDEX idx_livraisons_livreur ON public.livraisons(livreur_id);

CREATE TRIGGER livraisons_touch BEFORE UPDATE ON public.livraisons
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 21. Factures (invoices)
CREATE TABLE public.factures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  numero_facture TEXT NOT NULL UNIQUE,
  statut TEXT NOT NULL DEFAULT 'awaiting_payment',
  qr_code TEXT DEFAULT '',
  date_emission TIMESTAMPTZ NOT NULL DEFAULT now(),
  date_paiement TIMESTAMPTZ,
  date_livraison TIMESTAMPTZ
);
CREATE INDEX idx_factures_order ON public.factures(order_id);

-- 22. Reversements artisans (artisan payouts)
CREATE TABLE public.reversements_artisan (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  artisan_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  montant_brut NUMERIC(10,2) NOT NULL,
  commission NUMERIC(10,2) NOT NULL DEFAULT 0,
  montant_net NUMERIC(10,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_reversements_artisan ON public.reversements_artisan(artisan_id);

-- 23. Demandes de paiement (payment requests from artisans)
CREATE TABLE public.demandes_paiement (
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
CREATE INDEX idx_demandes_paiement_artisan ON public.demandes_paiement(artisan_id);

-- 24. Notifications (système complet)
CREATE TABLE public.notifications (
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
CREATE INDEX idx_notifications_user ON public.notifications(user_id);
CREATE INDEX idx_notifications_user_unread ON public.notifications(user_id, est_lu);

-- 25. Addresses
CREATE TABLE public.addresses (
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
CREATE INDEX idx_addresses_user_id ON public.addresses(user_id);

-- 26. Bookings (tourism)
CREATE TABLE public.bookings (
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
CREATE INDEX idx_bookings_user_id ON public.bookings(user_id);

-- 27. Reviews
CREATE TABLE public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, product_id)
);
CREATE INDEX idx_reviews_product_id ON public.reviews(product_id);

-- 28. Sessions (for local auth)
CREATE TABLE public.sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_sessions_token ON public.sessions(token);
CREATE INDEX idx_sessions_user_id ON public.sessions(user_id);

-- 29. Clean expired sessions function
CREATE OR REPLACE FUNCTION public.clean_expired_sessions()
RETURNS void
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM public.sessions WHERE expires_at < now()
$$;

-- 30. Blog articles
CREATE TABLE public.articles (
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

CREATE TRIGGER articles_touch BEFORE UPDATE ON public.articles
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
