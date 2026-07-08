-- =============================================================
-- TISSAGE — Données d'amorçage (enrichi eartisan)
-- =============================================================

-- Comptes de démonstration (mot de passe: test123)
INSERT INTO public.users (id, email, full_name, password_hash, is_active) VALUES
  (gen_random_uuid(), 'admin@test.com', 'Admin TISSAGE', 'c0a7fa96cf43eb8861b7cc45490280a0:bc75e94f64b1c7e95e1033b27cdbc73849d4321ed1312d516b249eac6d82e202793c72f7e7f8c4264d63ffe6c8547f01a3f74576fcc435b538bab581b50e3618', true),
  (gen_random_uuid(), 'client@test.com', 'Client Test', 'feab75be1cb48aae504e3509d3f7b4e8:55059314406a144ea11a6e71110a818a093973144d78d87a38b91a3c9859efb20eb6a250e7a2d27178d56dbf7a7e375ad49f76225c28623e44a7d2352a1bfab5', true),
  (gen_random_uuid(), 'artisan@test.com', 'Artisan Test', '9b5252ff56584f24fc71f499ae82378d:1dc950a0fe236cc88fea80879e36047aa36bf5177598af5665576bc1d43b5eaa4ed5f03692398b396b7571b16e521bfcd6c8ffc230f59b9039a376d95fd8344d', true),
  (gen_random_uuid(), 'livreur@test.com', 'Livreur Test', 'a5bf36b19693a6e8127b6afc9dc7a5b2:724dfdab03569226518aa2ebb4e5c949c9e7d713c2bea4e736ed7f66873e3e7423515b06ceb0677400e6ac272ef856571cde700ac4e3110c244f5bc20e671cd5', true)
ON CONFLICT (email) DO NOTHING;

-- Attribution des rôles
INSERT INTO public.user_roles (user_id, role)
SELECT u.id, r.role::public.app_role FROM public.users u CROSS JOIN (VALUES ('admin'), ('client'), ('artisan'), ('livreur')) AS r(role)
WHERE u.email = 'admin@test.com' AND NOT EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = u.id AND ur.role = r.role::public.app_role);
INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'client'::public.app_role FROM public.users u WHERE u.email = 'client@test.com' AND NOT EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = u.id AND ur.role = 'client'::public.app_role);
INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'artisan'::public.app_role FROM public.users u WHERE u.email = 'artisan@test.com' AND NOT EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = u.id AND ur.role = 'artisan'::public.app_role);
INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'livreur'::public.app_role FROM public.users u WHERE u.email = 'livreur@test.com' AND NOT EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = u.id AND ur.role = 'livreur'::public.app_role);

-- Categories (produits)
INSERT INTO public.categories (nom, description) VALUES
  ('Vannerie', 'Paniers, corbeilles et objets tressés en raphia, paille et fibres naturelles'),
  ('Sculpture', 'Statues, masques et œuvres sculptées dans le bois précieux'),
  ('Soie', 'Étoles, écharpes et tissages en soie sauvage malgache'),
  ('Bijoux', 'Boucles d''oreilles, pendentifs et parures en corne de zébu, laiton et perles'),
  ('Décoration', 'Vases, jarres et objets décoratifs en céramique et pierre'),
  ('Broderie', 'Tissus brodés main, nappes et linge de maison'),
  ('Accessoires', 'Sacs, ceintures et accessoires en cuir et raphia'),
  ('Textile', 'Tissus traditionnels, pagnes et étoffes');

-- Products
INSERT INTO public.products (id, name, artisan, country, category, material, price, rating, reviews, image, fast_ship, fair_trade, certified, is_new) VALUES
  ('p1', 'Sac en raphia naturel', 'Ravelonarivo Andry', 'Madagascar', 'Vannerie', 'Raphia', 45, 4.8, 124, '/images/p-basket.jpg', true, true, true, false),
  ('p2', 'Statue en bois sculpté', 'Diallo Mamadou', 'Sénégal', 'Sculpture', 'Bois', 120, 4.7, 58, '/images/p-statue.jpg', false, true, true, false),
  ('p3', 'Étole en soie sauvage', 'Hery Rakoto', 'Madagascar', 'Soie', 'Soie', 85, 4.9, 92, '/images/p-textile.jpg', false, true, false, true),
  ('p4', 'Boucles d''oreilles laiton', 'Asha Kimani', 'Kenya', 'Bijoux', 'Corne de zébu', 35, 4.6, 211, '/images/p-jewelry.jpg', true, false, false, false),
  ('p5', 'Vase céramique peint', 'Karim El Idrissi', 'Maroc', 'Décoration', 'Pierre', 60, 4.8, 71, '/images/p-vase.jpg', false, false, true, false),
  ('p6', 'Panier tressé XL', 'Ravelonarivo Andry', 'Madagascar', 'Vannerie', 'Raphia', 32, 4.9, 184, '/images/p-bag.jpg', true, true, false, true),
  ('p7', 'Corbeille décorative', 'Ravelonarivo Andry', 'Madagascar', 'Vannerie', 'Raphia', 35, 4.7, 27, '/images/p-basket.jpg', false, true, false, false),
  ('p8', 'Masque traditionnel', 'Diallo Mamadou', 'Mali', 'Sculpture', 'Bois', 95, 4.6, 33, '/images/p-statue.jpg', false, false, true, false),
  ('p9', 'Étoffe brodée main', 'Hery Rakoto', 'Madagascar', 'Broderie', 'Coton', 65, 4.7, 19, '/images/p-textile.jpg', false, false, false, true),
  ('p10', 'Pendentif corne & or', 'Asha Kimani', 'Kenya', 'Bijoux', 'Corne de zébu', 48, 4.8, 64, '/images/p-jewelry.jpg', false, true, false, false),
  ('p11', 'Jarre artisanale', 'Karim El Idrissi', 'Maroc', 'Décoration', 'Pierre', 110, 4.9, 12, '/images/p-vase.jpg', false, true, true, false),
  ('p12', 'Sac cabas raphia & cuir', 'Ravelonarivo Andry', 'Madagascar', 'Accessoires', 'Cuir', 78, 4.8, 47, '/images/p-bag.jpg', true, false, false, false)
ON CONFLICT (id) DO NOTHING;

-- Product variations
INSERT INTO public.product_variations (product_id, couleur, couleur_nom, taille, type_mesure, prix, stock, seuil_alerte) VALUES
  ('p1', '#8B7355', 'Naturel', 'M (35x25cm)', 'dimensions', 45, 15, 5),
  ('p1', '#8B7355', 'Naturel', 'L (45x35cm)', 'dimensions', 55, 8, 3),
  ('p4', '#C5A55A', 'Laiton doré', 'Unique', 'taille', 35, 25, 5),
  ('p4', '#C5A55A', 'Laiton argenté', 'Unique', 'taille', 38, 20, 5),
  ('p5', '#D4A574', 'Terre cuite', 'H 25cm', 'hauteur', 60, 10, 3),
  ('p5', '#D4A574', 'Terre cuite', 'H 35cm', 'hauteur', 85, 6, 3)
ON CONFLICT DO NOTHING;

-- Artisans
INSERT INTO public.artisans (id, name, specialty, country, city, rating, reviews, products, experience, certified, image) VALUES
  ('a1', 'Ravelonarivo Andry', 'Vannier traditionnel', 'Madagascar', 'Antananarivo', 4.8, 128, 48, 12, true, '/images/a-andry.jpg'),
  ('a2', 'Diallo Mamadou', 'Sculpteur sur bois', 'Sénégal', 'Dakar', 4.7, 86, 32, 18, true, '/images/a-jean.jpg'),
  ('a3', 'Hery Rakoto', 'Tisserande de soie', 'Madagascar', 'Fianarantsoa', 4.9, 211, 56, 15, true, '/images/a-marie.jpg'),
  ('a4', 'Asha Kimani', 'Bijoutière laiton', 'Kenya', 'Nairobi', 4.6, 64, 41, 9, false, '/images/a-nadia.jpg'),
  ('a5', 'Karim El Idrissi', 'Céramiste', 'Maroc', 'Fès', 4.8, 92, 28, 22, true, '/images/a-issa.jpg'),
  ('a6', 'Aminata Traoré', 'Brodeuse traditionnelle', 'Mali', 'Bamako', 4.7, 41, 19, 11, true, '/images/a-nadia.jpg')
ON CONFLICT (id) DO NOTHING;

-- Hubs régionaux
INSERT INTO public.hubs (nom, region, ville, adresse, contact, telephone, regions_servees, prix_par_km, prix_par_kg, mvola_number, airtel_money_number, orange_money_number) VALUES
  ('Hub Antananarivo', 'Analamanga', 'Antananarivo', 'Lot IVT 76 Ankadifotsy', 'Rakoto H.', '+261 34 12 345 67', '["Analamanga","Itasy","Bongolava","Vakinankaratra"]', 1500, 200, '034 12 345 67', '032 12 345 67', '033 12 345 67'),
  ('Hub Toamasina', 'Atsinanana', 'Toamasina', 'Bd Joffre 45', 'Bezara M.', '+261 34 76 543 21', '["Atsinanana","Analanjirofo","Alaotra-Mangoro"]', 1800, 250, '034 76 543 21', '032 76 543 21', '033 76 543 21'),
  ('Hub Fianarantsoa', 'Haute Matsiatra', 'Fianarantsoa', 'Route d''Antananarivo', 'Randria N.', '+261 34 98 765 43', '["Haute Matsiatra","Amoron''i Mania","Vatovavy","Fitovinany","Ihorombe"]', 1200, 180, '034 98 765 43', '032 98 765 43', '033 98 765 43'),
  ('Hub Mahajanga', 'Boeny', 'Mahajanga', 'Av. de l''Indépendance', 'Tsiresy M.', '+261 34 55 678 90', '["Boeny","Sofia","Betsiboka","Melaky"]', 1000, 150, '034 55 678 90', '032 55 678 90', '033 55 678 90'),
  ('Hub Antsiranana', 'Diana', 'Antsiranana', 'Place Kabary', 'Jaona L.', '+261 34 11 223 34', '["Diana","Sava"]', 2000, 300, '034 11 223 34', '032 11 223 34', '033 11 223 34');

-- Zones de livraison
INSERT INTO public.zones_livraison (hub_id, nom, ville, distance_km, delai_estime_jours)
SELECT h.id, 'Centre-ville Tana', 'Antananarivo', 5, 1 FROM public.hubs h WHERE h.nom='Hub Antananarivo'
UNION ALL SELECT h.id, 'Banlieue Nord', 'Ambohidratrimo', 25, 2 FROM public.hubs h WHERE h.nom='Hub Antananarivo'
UNION ALL SELECT h.id, 'Banlieue Sud', 'Antanifotsy', 35, 2 FROM public.hubs h WHERE h.nom='Hub Antananarivo'
UNION ALL SELECT h.id, 'Centre Toamasina', 'Toamasina', 3, 1 FROM public.hubs h WHERE h.nom='Hub Toamasina'
UNION ALL SELECT h.id, 'Brickaville', 'Brickaville', 80, 2 FROM public.hubs h WHERE h.nom='Hub Toamasina'
UNION ALL SELECT h.id, 'Centre Fiana', 'Fianarantsoa', 4, 1 FROM public.hubs h WHERE h.nom='Hub Fianarantsoa'
UNION ALL SELECT h.id, 'Ambositra', 'Ambositra', 85, 2 FROM public.hubs h WHERE h.nom='Hub Fianarantsoa'
ON CONFLICT (hub_id, nom) DO NOTHING;

-- Workshops
INSERT INTO public.workshops (id, title, location, duration, price, image, description, max_participants) VALUES
  ('w1', 'Atelier de vannerie traditionnelle', 'Antananarivo, Madagascar', 'Demi-journée', 45, '/images/p-basket.jpg', 'Apprenez les gestes ancestraux du tissage de raphia avec un maître vannier. Repartez avec votre création.', 8),
  ('w2', 'Formation sculpture sur bois', 'Dakar, Sénégal', '2 jours', 180, '/images/p-statue.jpg', 'Initiation aux outils traditionnels et techniques de sculpture sur bois précieux d''Afrique de l''Ouest.', 6),
  ('w3', 'Découverte du tissage de soie', 'Fianarantsoa, Madagascar', '1 journée', 75, '/images/p-textile.jpg', 'De la chenille sauvage au métier à tisser, plongez dans la soie malgache aux côtés des artisanes.', 10),
  ('w4', 'Initiation à la céramique', 'Fès, Maroc', 'Demi-journée', 55, '/images/p-vase.jpg', 'Modelage, tournage et premiers émaux dans l''antre d''un céramiste de la médina.', 8)
ON CONFLICT (id) DO NOTHING;

-- Blog articles
INSERT INTO public.articles (id, title, slug, category, excerpt, content, published_at) VALUES
  ('art1', 'Le raphia de Madagascar : un savoir-faire millénaire', 'raphia-madagascar-savoir-faire', 'Techniques', 'Découvrez l''art ancestral de la vannerie malgache, transmis de génération en génération.', 'Contenu complet à venir.', '2026-06-10T08:00:00Z'),
  ('art2', 'Comment Diallo a doublé son chiffre d''affaires en 6 mois', 'diallo-double-chiffre-affaires', 'Histoires', 'Le sculpteur sénégalais partage son expérience sur TISSAGE et l''export vers l''Europe.', 'Contenu complet à venir.', '2026-06-05T08:00:00Z'),
  ('art3', 'L''IA au service des artisans : 5 cas concrets', 'ia-service-artisans-cas-concrets', 'IA Tissage', 'Traduction, SEO, fiches produits : comment l''IA libère du temps aux artisans.', 'Contenu complet à venir.', '2026-05-28T08:00:00Z'),
  ('art4', 'Logistique mutualisée : 40% d''économies sur le fret', 'logistique-mutualisee-economies', 'Logistique', 'Le hub TISSAGE permet aux artisans de partager les coûts d''expédition.', 'Contenu complet à venir.', '2026-05-20T08:00:00Z'),
  ('art5', 'La soie sauvage de Fianarantsoa', 'soie-sauvage-fianarantsoa', 'Techniques', 'Plongée dans un atelier de tissage traditionnel des hauts plateaux malgaches.', 'Contenu complet à venir.', '2026-05-12T08:00:00Z'),
  ('art6', 'B2B : comment les hôtels de luxe sourcent l''artisanat', 'b2b-hotels-luxe-sourcent', 'B2B', 'Les nouvelles attentes des grands groupes hôteliers en matière d''authenticité.', 'Contenu complet à venir.', '2026-05-02T08:00:00Z')
ON CONFLICT (id) DO NOTHING;

-- Notifications système (exemples) — ne s'exécute que si des utilisateurs existent
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.users) THEN
    INSERT INTO public.notifications (user_id, categorie, type_notif, titre, message, icone, couleur)
    SELECT u.id, 'systeme', 'autre', 'Bienvenue sur TISSAGE', 'Votre compte a été créé avec succès. Découvrez le marché des artisans du monde entier.', 'bell', 'info'
    FROM public.users u
    WHERE NOT EXISTS (SELECT 1 FROM public.notifications n WHERE n.user_id = u.id)
    LIMIT 1;
  END IF;
END;
$$;
