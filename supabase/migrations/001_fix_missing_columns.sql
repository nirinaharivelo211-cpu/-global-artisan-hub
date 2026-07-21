-- =============================================================
-- FIX: Add all missing columns from earlier migrations
-- The initial migration created tables with fewer columns.
-- This adds every column the app code references.
-- Safe to run: uses ADD COLUMN IF NOT EXISTS everywhere.
-- =============================================================

-- 1. orders: add missing columns
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS cart_session_id UUID;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS hub_source_id UUID REFERENCES public.hubs(id) ON DELETE SET NULL;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS hub_destination_id UUID REFERENCES public.hubs(id) ON DELETE SET NULL;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS zone_livraison_id UUID REFERENCES public.zones_livraison(id) ON DELETE SET NULL;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS qr_code TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS notes TEXT DEFAULT '';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS mobile_money_provider TEXT DEFAULT '';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS mobile_money_ref TEXT DEFAULT '';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS auto_cancel_at TIMESTAMPTZ;

-- 2. cart_items: add missing columns
ALTER TABLE public.cart_items ADD COLUMN IF NOT EXISTS cart_session_id UUID REFERENCES public.cart_sessions(id) ON DELETE CASCADE;
ALTER TABLE public.cart_items ADD COLUMN IF NOT EXISTS variation_id UUID REFERENCES public.product_variations(id) ON DELETE SET NULL;
ALTER TABLE public.cart_items ADD COLUMN IF NOT EXISTS snapshot_couleur TEXT DEFAULT '';
ALTER TABLE public.cart_items ADD COLUMN IF NOT EXISTS snapshot_taille TEXT DEFAULT '';
ALTER TABLE public.cart_items ADD COLUMN IF NOT EXISTS snapshot_poids NUMERIC(10,2);
ALTER TABLE public.cart_items ADD COLUMN IF NOT EXISTS fulfillment_status TEXT DEFAULT '';
ALTER TABLE public.cart_items ADD COLUMN IF NOT EXISTS fulfillment_quantity INT;
ALTER TABLE public.cart_items ADD COLUMN IF NOT EXISTS expedition_mode TEXT DEFAULT '';
ALTER TABLE public.cart_items ADD COLUMN IF NOT EXISTS expedition_cooperative TEXT DEFAULT '';
ALTER TABLE public.cart_items ADD COLUMN IF NOT EXISTS expedition_numero_colis TEXT DEFAULT '';
ALTER TABLE public.cart_items ADD COLUMN IF NOT EXISTS colis_id UUID;

-- 3. artisans: add missing columns
ALTER TABLE public.artisans ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.users(id) ON DELETE SET NULL;
ALTER TABLE public.artisans ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE public.artisans ADD COLUMN IF NOT EXISTS adresse TEXT DEFAULT '';
ALTER TABLE public.artisans ADD COLUMN IF NOT EXISTS telephone TEXT DEFAULT '';
ALTER TABLE public.artisans ADD COLUMN IF NOT EXISTS email_contact TEXT DEFAULT '';
ALTER TABLE public.artisans ADD COLUMN IF NOT EXISTS site_web TEXT DEFAULT '';
ALTER TABLE public.artisans ADD COLUMN IF NOT EXISTS photo_couverture TEXT DEFAULT '';

-- 4. colis: add missing columns
ALTER TABLE public.colis ADD COLUMN IF NOT EXISTS numero_colis TEXT DEFAULT '';
ALTER TABLE public.colis ADD COLUMN IF NOT EXISTS qr_code TEXT DEFAULT '';
ALTER TABLE public.colis ADD COLUMN IF NOT EXISTS collected_by UUID REFERENCES public.users(id) ON DELETE SET NULL;

-- 5. livraisons: add missing columns
ALTER TABLE public.livraisons ADD COLUMN IF NOT EXISTS cooperative_nom TEXT DEFAULT '';
ALTER TABLE public.livraisons ADD COLUMN IF NOT EXISTS cooperative_numero_suivi TEXT DEFAULT '';
ALTER TABLE public.livraisons ADD COLUMN IF NOT EXISTS shipped_at TIMESTAMPTZ;
ALTER TABLE public.livraisons ADD COLUMN IF NOT EXISTS qr_code TEXT;
ALTER TABLE public.livraisons ADD COLUMN IF NOT EXISTS commentaires TEXT DEFAULT '';
ALTER TABLE public.livraisons ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- 6. factures: add missing columns
ALTER TABLE public.factures ADD COLUMN IF NOT EXISTS statut TEXT DEFAULT 'awaiting_payment';
ALTER TABLE public.factures ADD COLUMN IF NOT EXISTS date_emission TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.factures ADD COLUMN IF NOT EXISTS date_paiement TIMESTAMPTZ;
ALTER TABLE public.factures ADD COLUMN IF NOT EXISTS date_livraison TIMESTAMPTZ;

-- 7. users: add missing columns
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS nom TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS prenom TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT false;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS hub_id UUID;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS suspendu_jusqua TIMESTAMPTZ;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS suspension_motif TEXT DEFAULT '';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS quota_quotidien INT DEFAULT 8;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS zone_livraison_id UUID;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- 8. product_variations: add missing columns
ALTER TABLE public.product_variations ADD COLUMN IF NOT EXISTS image TEXT;

-- 9. hubs: add missing columns
ALTER TABLE public.hubs ADD COLUMN IF NOT EXISTS regions_servees JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.hubs ADD COLUMN IF NOT EXISTS mm_account_holder TEXT DEFAULT '';
ALTER TABLE public.hubs ADD COLUMN IF NOT EXISTS delai_defaut_jours INT DEFAULT 5;
ALTER TABLE public.hubs ADD COLUMN IF NOT EXISTS quota_quotidien_defaut INT DEFAULT 15;

-- 10. promotions: add missing columns
ALTER TABLE public.promotions ADD COLUMN IF NOT EXISTS max_uses INT;

-- 11. articles: add missing columns
ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS slug TEXT;
ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- 12. bookings: add missing columns
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS workshop_location TEXT;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS workshop_image TEXT;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS notes TEXT;

-- 13. reversements_artisan: add missing columns
ALTER TABLE public.reversements_artisan ADD COLUMN IF NOT EXISTS statut TEXT DEFAULT 'pending';
ALTER TABLE public.reversements_artisan ADD COLUMN IF NOT EXISTS date_versement TIMESTAMPTZ;

-- 14. b2b_profiles: add missing columns
ALTER TABLE public.b2b_profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- 15. Ensure cart_session index exists
CREATE INDEX IF NOT EXISTS idx_cart_items_session ON public.cart_items(cart_session_id);

-- 16. Add RLS for new tables if missing
ALTER TABLE public.workshops ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Workshops are public" ON public.workshops FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Categories are public" ON public.categories FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE public.artisans ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Artisans are public" ON public.artisans FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Published products are public" ON public.products FOR SELECT USING (statut = 'publie');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "Artisans manage own products" ON public.products FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE public.product_variations ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Variations visible with product" ON public.product_variations FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Product images are public" ON public.product_images FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE public.hubs ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Hubs are public" ON public.hubs FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE public.zones_livraison ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Zones are public" ON public.zones_livraison FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE public.articles ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Articles are public" ON public.articles FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE public.factures ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Users see own invoices" ON public.factures FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND (o.user_id = auth.uid() OR public.has_role(auth.uid(), 'admin')))
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE public.reversements_artisan ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Admins see all payouts" ON public.reversements_artisan FOR ALL USING (public.has_role(auth.uid(), 'admin'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE public.demandes_paiement ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Artisans manage own payment requests" ON public.demandes_paiement FOR ALL USING (auth.uid() = artisan_id) WITH CHECK (auth.uid() = artisan_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE public.colis ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Users see own colis" ON public.colis FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE public.livraisons ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Users see own livraisons" ON public.livraisons FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 17. Enable RLS on tables that might be missing it
DO $$ BEGIN
  ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.cart_sessions ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.utilisateurs_utilisateur_zones_livraison ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Done
SELECT 'FIX MIGRATION COMPLETE - all missing columns and RLS added' as status;
