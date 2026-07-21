import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { query, unsafeQuery, DbError } from "../db.server";
import { getServerConfig } from "../config.server";
import type {
  DbProduct, DbArtisan, DbWorkshop, DbArticle, DbOrder, DbCartItem,
  DbOrderItem, DbBooking, DbReview, DbHub, DbZoneLivraison, DbLivraison,
  DbColis, DbNotification, DbFacture, DbReversement, DbDemandePaiement,
  DbCartSession, DbProductVariation, DbProductImage, DbCategory,
  StatsResponse, UserWithRoles, GlobalSearchResult, CronResult,
  ReviewWithProduct, NotificationWithUser, SalesAnalytics, TopProduct,
  RevenuePoint, LowStockItem, ActivityEntry, DbPromotion, B2BProfile,
  UserProfileUpdate,
} from "../types";
import { AppError } from "../types";

function getConfig() {
  return getServerConfig();
}

const PRODUCT_COLS = `
  id, name, artisan, country, category, material, price, rating, reviews,
  image AS "img", fast_ship AS "fastShip", fair_trade AS "fairTrade",
  certified, is_new AS "isNew", created_at
`;

export const getProducts = createServerFn({ method: "GET" })
  .handler(async () => {
    try {
      const rows = await unsafeQuery<DbProduct>(`SELECT ${PRODUCT_COLS} FROM public.products ORDER BY created_at DESC`);
      return rows;
    } catch (e) { throw AppError.from(e); }
  });

export const getProductById = createServerFn({ method: "GET" })
  .validator(z.object({ id: z.string() }))
  .handler(async ({ data }) => {
    try {
      const rows = await unsafeQuery<DbProduct>(`SELECT ${PRODUCT_COLS} FROM public.products WHERE id = $1`, [data.id]);
      return rows[0] ?? null;
    } catch (e) { throw AppError.from(e); }
  });

export const getProductsByCategory = createServerFn({ method: "GET" })
  .validator(z.object({ category: z.string() }))
  .handler(async ({ data }) => {
    try {
      const rows = await unsafeQuery<DbProduct>(`SELECT ${PRODUCT_COLS} FROM public.products WHERE category = $1 ORDER BY created_at DESC`, [data.category]);
      return rows;
    } catch (e) { throw AppError.from(e); }
  });

export const searchProducts = createServerFn({ method: "GET" })
  .validator(z.object({
    q: z.string().default(""), minPrice: z.number().optional(),
    maxPrice: z.number().optional(), countries: z.array(z.string()).optional(),
    categories: z.array(z.string()).optional(), materials: z.array(z.string()).optional(),
    fastShip: z.boolean().optional(), fairTrade: z.boolean().optional(),
    certified: z.boolean().optional(),
    sort: z.enum(["popular","price-asc","price-desc","new","rating"]).default("popular"),
  }))
  .handler(async ({ data }) => {
    try {
      const conditions: string[] = [];
      const params: (string | number | string[])[] = [];
      let idx = 1;

      if (data.q) {
        conditions.push(`(LOWER(name) LIKE $${idx} OR LOWER(artisan) LIKE $${idx} OR LOWER(category) LIKE $${idx} OR LOWER(material) LIKE $${idx} OR LOWER(country) LIKE $${idx})`);
        params.push(`%${data.q.toLowerCase()}%`);
        idx++;
      }
      if (data.minPrice !== undefined) { conditions.push(`price >= $${idx}`); params.push(data.minPrice); idx++; }
      if (data.maxPrice !== undefined) { conditions.push(`price <= $${idx}`); params.push(data.maxPrice); idx++; }
      if (data.countries?.length) { conditions.push(`country = ANY($${idx}::text[])`); params.push(data.countries); idx++; }
      if (data.categories?.length) { conditions.push(`category = ANY($${idx}::text[])`); params.push(data.categories); idx++; }
      if (data.materials?.length) { conditions.push(`material = ANY($${idx}::text[])`); params.push(data.materials); idx++; }
      if (data.fastShip) conditions.push("fast_ship = true");
      if (data.fairTrade) conditions.push("fair_trade = true");
      if (data.certified) conditions.push("certified = true");

      let orderBy = "reviews DESC";
      switch (data.sort) {
        case "price-asc": orderBy = "price ASC"; break;
        case "price-desc": orderBy = "price DESC"; break;
        case "new": orderBy = "is_new DESC, created_at DESC"; break;
        case "rating": orderBy = "rating DESC"; break;
      }

      const sql = `SELECT ${PRODUCT_COLS} FROM public.products ${conditions.length ? `WHERE ${conditions.join(" AND ")}` : ""} ORDER BY ${orderBy}`;
      const rows = await unsafeQuery<DbProduct>(sql, params);
      return rows;
    } catch (e) { throw AppError.from(e); }
  });

export const getArtisans = createServerFn({ method: "GET" })
  .handler(async () => {
    try {
      return await query<DbArtisan>`SELECT * FROM public.artisans ORDER BY name ASC`;
    } catch (e) { throw AppError.from(e); }
  });

export const getArtisanById = createServerFn({ method: "GET" })
  .validator(z.object({ id: z.string() }))
  .handler(async ({ data }) => {
    try {
      const rows = await query<DbArtisan>`SELECT * FROM public.artisans WHERE id = ${data.id}`;
      return rows[0] ?? null;
    } catch (e) { throw AppError.from(e); }
  });

export const getArtisanProducts = createServerFn({ method: "GET" })
  .validator(z.object({ artisanName: z.string() }))
  .handler(async ({ data }) => {
    try {
      const rows = await unsafeQuery<DbProduct>(`SELECT ${PRODUCT_COLS} FROM public.products WHERE artisan = $1 ORDER BY created_at DESC`, [data.artisanName]);
      return rows;
    } catch (e) { throw AppError.from(e); }
  });

export const getAtelier = createServerFn({ method: "GET" })
  .validator(z.object({ userId: z.string() }))
  .handler(async ({ data }) => {
    try {
      const rows = await unsafeQuery(`SELECT * FROM public.artisans WHERE user_id = $1 LIMIT 1`, [data.userId]);
      return rows[0] ?? null;
    } catch (e) { throw AppError.from(e); }
  });

export const upsertAtelier = createServerFn({ method: "POST" })
  .validator(z.object({
    userId: z.string(), name: z.string(), specialty: z.string().optional(),
    country: z.string().optional(), city: z.string().optional(),
    bio: z.string().optional(), image: z.string().optional(),
    photoCouverture: z.string().optional(), adresse: z.string().optional(),
    telephone: z.string().optional(), emailContact: z.string().optional(),
    siteWeb: z.string().optional(),
  }))
  .handler(async ({ data }) => {
    try {
      const existing = await unsafeQuery<{ id: string }>(`SELECT id FROM public.artisans WHERE user_id = $1 LIMIT 1`, [data.userId]);
      if (existing.length > 0) {
        await unsafeQuery(
          `UPDATE public.artisans SET name = $1, specialty = $2, country = $3, city = $4, bio = $5, image = $6, photo_couverture = $7, adresse = $8, telephone = $9, email_contact = $10, site_web = $11 WHERE user_id = $12`,
          [data.name, data.specialty ?? '', data.country ?? '', data.city ?? '', data.bio ?? '', data.image ?? '', data.photoCouverture ?? '', data.adresse ?? '', data.telephone ?? '', data.emailContact ?? '', data.siteWeb ?? '', data.userId]
        );
      } else {
        await unsafeQuery(
          `INSERT INTO public.artisans (id, user_id, name, specialty, country, city, bio, image, photo_couverture, adresse, telephone, email_contact, site_web) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
          [crypto.randomUUID(), data.userId, data.name, data.specialty ?? '', data.country ?? '', data.city ?? '', data.bio ?? '', data.image ?? '', data.photoCouverture ?? '', data.adresse ?? '', data.telephone ?? '', data.emailContact ?? '', data.siteWeb ?? '']
        );
      }
      return { success: true };
    } catch (e) { throw AppError.from(e); }
  });

export const getCategories = createServerFn({ method: "GET" })
  .handler(async () => {
    try {
      const rows = await query<{ category: string }>`SELECT DISTINCT category FROM public.products ORDER BY category`;
      return rows.map(r => r.category);
    } catch (e) { throw AppError.from(e); }
  });

export const getCountries = createServerFn({ method: "GET" })
  .handler(async () => {
    try {
      const rows = await query<{ country: string }>`SELECT DISTINCT country FROM public.products ORDER BY country`;
      return rows.map(r => r.country);
    } catch (e) { throw AppError.from(e); }
  });

export const getMaterials = createServerFn({ method: "GET" })
  .handler(async () => {
    try {
      const rows = await query<{ material: string }>`SELECT DISTINCT material FROM public.products ORDER BY material`;
      return rows.map(r => r.material);
    } catch (e) { throw AppError.from(e); }
  });

const WORKSHOP_COLS = `id, title, location, duration, price, image AS "img", description, max_participants AS "maxParticipants", created_at`;

export const getWorkshops = createServerFn({ method: "GET" })
  .handler(async () => {
    try {
      const rows = await unsafeQuery<DbWorkshop>(`SELECT ${WORKSHOP_COLS} FROM public.workshops ORDER BY title ASC`);
      return rows;
    } catch (e) { throw AppError.from(e); }
  });

export const getWorkshopById = createServerFn({ method: "GET" })
  .validator(z.object({ id: z.string() }))
  .handler(async ({ data }) => {
    try {
      const rows = await unsafeQuery<DbWorkshop>(`SELECT ${WORKSHOP_COLS} FROM public.workshops WHERE id = $1`, [data.id]);
      return rows[0] ?? null;
    } catch (e) { throw AppError.from(e); }
  });

export const getArticles = createServerFn({ method: "GET" })
  .handler(async () => {
    try {
      return await query<DbArticle>`SELECT * FROM public.articles ORDER BY published_at DESC`;
    } catch (e) { throw AppError.from(e); }
  });

export const getArticleById = createServerFn({ method: "GET" })
  .validator(z.object({ id: z.string() }))
  .handler(async ({ data }) => {
    try {
      const rows = await query<DbArticle>`SELECT * FROM public.articles WHERE id = ${data.id}`;
      return rows[0] ?? null;
    } catch (e) { throw AppError.from(e); }
  });

export const getUserOrders = createServerFn({ method: "GET" })
  .validator(z.object({ userId: z.string() }))
  .handler(async ({ data }) => {
    try {
      return await query<DbOrder>`SELECT * FROM public.orders WHERE user_id = ${data.userId} ORDER BY created_at DESC`;
    } catch (e) { throw AppError.from(e); }
  });

export const getOrderById = createServerFn({ method: "GET" })
  .validator(z.object({ id: z.string() }))
  .handler(async ({ data }) => {
    try {
      const rows = await query<DbOrder>`SELECT * FROM public.orders WHERE id = ${data.id}`;
      return rows[0] ?? null;
    } catch (e) { throw AppError.from(e); }
  });

export const getOrderItems = createServerFn({ method: "GET" })
  .validator(z.object({ orderId: z.string() }))
  .handler(async ({ data }) => {
    try {
      return await query<DbOrderItem>`SELECT * FROM public.order_items WHERE order_id = ${data.orderId}`;
    } catch (e) { throw AppError.from(e); }
  });

export const createOrder = createServerFn({ method: "POST" })
  .validator(z.object({
    userId: z.string(), subtotal: z.number(), shipping: z.number(),
    total: z.number(), currency: z.string().default("EUR"),
    paymentMethod: z.string().default("demo"), shippingAddress: z.any(),
    carrier: z.string().optional(),
    items: z.array(z.object({
      product_id: z.string(), product_name: z.string(),
      product_image: z.string().nullable(), artisan_name: z.string().nullable(),
      unit_price: z.number(), quantity: z.number(),
    })),
  }))
  .handler(async ({ data }) => {
    try {
      const orderRows = await query<DbOrder>`
        INSERT INTO public.orders (user_id, status, subtotal, shipping, total, currency, payment_method, shipping_address, carrier)
        VALUES (${data.userId}, 'paid', ${data.subtotal}, ${data.shipping}, ${data.total}, ${data.currency}, ${data.paymentMethod}, ${JSON.stringify(data.shippingAddress)}, ${data.carrier ?? "DHL"})
        RETURNING *
      `;
      const order = orderRows[0];

      for (const item of data.items) {
        await query`
          INSERT INTO public.order_items (order_id, product_id, product_name, product_image, artisan_name, unit_price, quantity, line_total)
          VALUES (${order.id}, ${item.product_id}, ${item.product_name}, ${item.product_image}, ${item.artisan_name}, ${item.unit_price}, ${item.quantity}, ${item.unit_price * item.quantity})
        `;
      }

      await query`DELETE FROM public.cart_items WHERE user_id = ${data.userId}`;
      return order;
    } catch (e) { throw AppError.from(e); }
  });

export const getCartItems = createServerFn({ method: "GET" })
  .validator(z.object({ userId: z.string() }))
  .handler(async ({ data }) => {
    try {
      return await query<DbCartItem>`SELECT * FROM public.cart_items WHERE user_id = ${data.userId} ORDER BY created_at DESC`;
    } catch (e) { throw AppError.from(e); }
  });

export const addToCart = createServerFn({ method: "POST" })
  .validator(z.object({
    userId: z.string(), productId: z.string(), productName: z.string(),
    productImage: z.string().nullable(), artisanName: z.string().nullable(),
    unitPrice: z.number(), quantity: z.number().min(1),
  }))
  .handler(async ({ data }) => {
    try {
      const existing = await query<DbCartItem>`
        SELECT id, quantity FROM public.cart_items WHERE user_id = ${data.userId} AND product_id = ${data.productId}
      `;
      if (existing.length > 0) {
        const item = existing[0];
        await query`UPDATE public.cart_items SET quantity = ${item.quantity + data.quantity} WHERE id = ${item.id}`;
      } else {
        await query`
          INSERT INTO public.cart_items (user_id, product_id, product_name, product_image, artisan_name, unit_price, quantity)
          VALUES (${data.userId}, ${data.productId}, ${data.productName}, ${data.productImage}, ${data.artisanName}, ${data.unitPrice}, ${data.quantity})
        `;
      }
      return { success: true };
    } catch (e) { throw AppError.from(e); }
  });

export const updateCartItem = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string(), quantity: z.number().min(0) }))
  .handler(async ({ data }) => {
    try {
      if (data.quantity <= 0) {
        await query`DELETE FROM public.cart_items WHERE id = ${data.id}`;
      } else {
        await query`UPDATE public.cart_items SET quantity = ${data.quantity} WHERE id = ${data.id}`;
      }
      return { success: true };
    } catch (e) { throw AppError.from(e); }
  });

export const removeCartItem = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string() }))
  .handler(async ({ data }) => {
    try {
      await query`DELETE FROM public.cart_items WHERE id = ${data.id}`;
      return { success: true };
    } catch (e) { throw AppError.from(e); }
  });

export const createBooking = createServerFn({ method: "POST" })
  .validator(z.object({
    userId: z.string(), workshopId: z.string(), workshopTitle: z.string(),
    workshopLocation: z.string().nullable(), workshopImage: z.string().nullable(),
    bookingDate: z.string(), participants: z.number().min(1),
    unitPrice: z.number(), total: z.number(), currency: z.string().default("EUR"),
    notes: z.string().nullable().optional(),
  }))
  .handler(async ({ data }) => {
    try {
      const rows = await query<DbBooking>`
        INSERT INTO public.bookings (user_id, workshop_id, workshop_title, workshop_location, workshop_image, booking_date, participants, unit_price, total, currency, notes, status)
        VALUES (${data.userId}, ${data.workshopId}, ${data.workshopTitle}, ${data.workshopLocation}, ${data.workshopImage}, ${data.bookingDate}, ${data.participants}, ${data.unitPrice}, ${data.total}, ${data.currency}, ${data.notes ?? null}, 'pending')
        RETURNING *
      `;
      return rows[0] ?? null;
    } catch (e) { throw AppError.from(e); }
  });

export const getProductReviews = createServerFn({ method: "GET" })
  .validator(z.object({ productId: z.string() }))
  .handler(async ({ data }) => {
    try {
      const rows = await query<DbReview>`
        SELECT r.*, u.full_name as user_name
        FROM public.reviews r
        LEFT JOIN public.users u ON u.id = r.user_id
        WHERE r.product_id = ${data.productId}
        ORDER BY r.created_at DESC
      `;
      return rows;
    } catch (e) { throw AppError.from(e); }
  });

export const createReview = createServerFn({ method: "POST" })
  .validator(z.object({
    userId: z.string(), productId: z.string(),
    rating: z.number().min(1).max(5), comment: z.string().optional(),
  }))
  .handler(async ({ data }) => {
    try {
      const rows = await query<DbReview>`
        INSERT INTO public.reviews (user_id, product_id, rating, comment)
        VALUES (${data.userId}, ${data.productId}, ${data.rating}, ${data.comment ?? null})
        ON CONFLICT (user_id, product_id) DO UPDATE SET rating = ${data.rating}, comment = ${data.comment ?? null}, created_at = now()
        RETURNING *
      `;
      return rows[0] ?? null;
    } catch (e) { throw AppError.from(e); }
  });

export const getHubs = createServerFn({ method: "GET" })
  .handler(async () => {
    try {
      const rows = await unsafeQuery<DbHub>(`SELECT * FROM public.hubs ORDER BY nom ASC`);
      return rows;
    } catch (e) { throw AppError.from(e); }
  });

export const getHubById = createServerFn({ method: "GET" })
  .validator(z.object({ id: z.string() }))
  .handler(async ({ data }) => {
    try {
      const rows = await query<DbHub>`SELECT * FROM public.hubs WHERE id = ${data.id}`;
      return rows[0] ?? null;
    } catch (e) { throw AppError.from(e); }
  });

export const createHub = createServerFn({ method: "POST" })
  .validator(z.object({
    nom: z.string(), region: z.string(), ville: z.string(),
    adresse: z.string().optional(), contact: z.string().optional(),
    telephone: z.string().optional(), gestionnaireId: z.string().optional(),
    prixParKm: z.number().optional(), prixParKg: z.number().optional(),
  }))
  .handler(async ({ data }) => {
    try {
      const rows = await query<DbHub>`
        INSERT INTO public.hubs (nom, region, ville, adresse, contact, telephone, gestionnaire_id, prix_par_km, prix_par_kg)
        VALUES (${data.nom}, ${data.region}, ${data.ville}, ${data.adresse ?? ''}, ${data.contact ?? ''}, ${data.telephone ?? ''}, ${data.gestionnaireId ?? null}, ${data.prixParKm ?? 0}, ${data.prixParKg ?? 0})
        RETURNING *
      `;
      return rows[0] ?? null;
    } catch (e) { throw AppError.from(e); }
  });

export const updateHub = createServerFn({ method: "POST" })
  .validator(z.object({
    id: z.string(), nom: z.string().optional(), region: z.string().optional(),
    ville: z.string().optional(), adresse: z.string().optional(),
    actif: z.boolean().optional(),
  }))
  .handler(async ({ data }) => {
    try {
      const sets: string[] = [];
      const params: (string | boolean)[] = [];
      let idx = 1;
      if (data.nom !== undefined) { sets.push(`nom = $${idx}`); params.push(data.nom); idx++; }
      if (data.region !== undefined) { sets.push(`region = $${idx}`); params.push(data.region); idx++; }
      if (data.ville !== undefined) { sets.push(`ville = $${idx}`); params.push(data.ville); idx++; }
      if (data.adresse !== undefined) { sets.push(`adresse = $${idx}`); params.push(data.adresse); idx++; }
      if (data.actif !== undefined) { sets.push(`actif = $${idx}`); params.push(data.actif); idx++; }
      if (sets.length === 0) return null;
      params.push(data.id);
      await unsafeQuery(`UPDATE public.hubs SET ${sets.join(", ")} WHERE id = $${idx}`, params);
      return { success: true };
    } catch (e) { throw AppError.from(e); }
  });

export const getZonesByHub = createServerFn({ method: "GET" })
  .validator(z.object({ hubId: z.string() }))
  .handler(async ({ data }) => {
    try {
      return await query<DbZoneLivraison>`SELECT * FROM public.zones_livraison WHERE hub_id = ${data.hubId} ORDER BY nom ASC`;
    } catch (e) { throw AppError.from(e); }
  });

export const createZone = createServerFn({ method: "POST" })
  .validator(z.object({
    hubId: z.string(), nom: z.string(), ville: z.string().optional(),
    distanceKm: z.number().optional(), delaiJours: z.number().optional(),
  }))
  .handler(async ({ data }) => {
    try {
      const rows = await query<DbZoneLivraison>`
        INSERT INTO public.zones_livraison (hub_id, nom, ville, distance_km, delai_estime_jours)
        VALUES (${data.hubId}, ${data.nom}, ${data.ville ?? ''}, ${data.distanceKm ?? null}, ${data.delaiJours ?? 3})
        RETURNING *
      `;
      return rows[0] ?? null;
    } catch (e) { throw AppError.from(e); }
  });

export const getColisByOrder = createServerFn({ method: "GET" })
  .validator(z.object({ orderId: z.string() }))
  .handler(async ({ data }) => {
    try {
      const rows = await query<DbColis>`
        SELECT c.*, u.full_name as artisan_name
        FROM public.colis c
        LEFT JOIN public.users u ON u.id = c.artisan_id
        WHERE c.order_id = ${data.orderId}
        ORDER BY c.created_at DESC
      `;
      return rows;
    } catch (e) { throw AppError.from(e); }
  });

export const createColis = createServerFn({ method: "POST" })
  .validator(z.object({
    orderId: z.string(), artisanId: z.string().optional(),
    mode: z.string().optional(), cooperativeNom: z.string().optional(),
    lieuDepart: z.string().optional(),
  }))
  .handler(async ({ data }) => {
    try {
      const rows = await query<DbColis>`
        INSERT INTO public.colis (order_id, artisan_id, mode, cooperative_nom, lieu_depart)
        VALUES (${data.orderId}, ${data.artisanId ?? null}, ${data.mode ?? ''}, ${data.cooperativeNom ?? ''}, ${data.lieuDepart ?? ''})
        RETURNING *
      `;
      return rows[0] ?? null;
    } catch (e) { throw AppError.from(e); }
  });

export const updateColisStatus = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string(), statut: z.string(), collectedBy: z.string().optional() }))
  .handler(async ({ data }) => {
    try {
      const now = new Date().toISOString();
      if (data.statut === 'deposited') {
        await query`UPDATE public.colis SET statut = ${data.statut}, submitted_at = ${now} WHERE id = ${data.id}`;
      } else if (data.statut === 'collected') {
        await query`UPDATE public.colis SET statut = ${data.statut}, collected_at = ${now}, collected_by = ${data.collectedBy ?? null} WHERE id = ${data.id}`;
      } else {
        await query`UPDATE public.colis SET statut = ${data.statut} WHERE id = ${data.id}`;
      }
      return { success: true };
    } catch (e) { throw AppError.from(e); }
  });

export const getLivraisons = createServerFn({ method: "GET" })
  .validator(z.object({ livreurId: z.string().optional() }))
  .handler(async ({ data }) => {
    try {
      if (data.livreurId) {
        return await query<DbLivraison>`
          SELECT l.*, o.order_number, o.status as order_status
          FROM public.livraisons l
          JOIN public.orders o ON o.id = l.order_id
          WHERE l.livreur_id = ${data.livreurId}
          ORDER BY l.date_prevue ASC
        `;
      }
      return await query<DbLivraison>`
        SELECT l.*, o.order_number, o.status as order_status
        FROM public.livraisons l
        JOIN public.orders o ON o.id = l.order_id
        ORDER BY l.created_at DESC
      `;
    } catch (e) { throw AppError.from(e); }
  });

export const createLivraison = createServerFn({ method: "POST" })
  .validator(z.object({
    orderId: z.string(), livreurId: z.string().optional(),
    hubSourceId: z.string().optional(), hubDestId: z.string().optional(),
    zoneLivraisonId: z.string().optional(), datePrevue: z.string(),
    montantDu: z.number(),
  }))
  .handler(async ({ data }) => {
    try {
      const rows = await query<DbLivraison>`
        INSERT INTO public.livraisons (order_id, livreur_id, hub_source_id, hub_destination_id, zone_livraison_id, date_prevue, montant_du)
        VALUES (${data.orderId}, ${data.livreurId ?? null}, ${data.hubSourceId ?? null}, ${data.hubDestId ?? null}, ${data.zoneLivraisonId ?? null}, ${data.datePrevue}, ${data.montantDu})
        RETURNING *
      `;
      return rows[0] ?? null;
    } catch (e) { throw AppError.from(e); }
  });

export const updateLivraisonPayment = createServerFn({ method: "POST" })
  .validator(z.object({
    id: z.string(), montantEncaisse: z.number(),
    modePaiement: z.string(), statutPaiement: z.string(),
  }))
  .handler(async ({ data }) => {
    try {
      await query`
        UPDATE public.livraisons SET montant_encaisse = ${data.montantEncaisse}, mode_paiement = ${data.modePaiement}, statut_paiement = ${data.statutPaiement}
        WHERE id = ${data.id}
      `;
      return { success: true };
    } catch (e) { throw AppError.from(e); }
  });

export const getUserNotifications = createServerFn({ method: "GET" })
  .validator(z.object({ userId: z.string(), unreadOnly: z.boolean().optional() }))
  .handler(async ({ data }) => {
    try {
      if (data.unreadOnly) {
        return await query<DbNotification>`SELECT * FROM public.notifications WHERE user_id = ${data.userId} AND est_lu = false ORDER BY created_at DESC LIMIT 50`;
      }
      return await query<DbNotification>`SELECT * FROM public.notifications WHERE user_id = ${data.userId} ORDER BY created_at DESC LIMIT 100`;
    } catch (e) { throw AppError.from(e); }
  });

export const getUnreadCount = createServerFn({ method: "GET" })
  .validator(z.object({ userId: z.string() }))
  .handler(async ({ data }) => {
    try {
      const rows = await query<{ count: number }>`SELECT COUNT(*) as count FROM public.notifications WHERE user_id = ${data.userId} AND est_lu = false`;
      return Number(rows[0]?.count ?? 0);
    } catch (e) { throw AppError.from(e); }
  });

export const createNotification = createServerFn({ method: "POST" })
  .validator(z.object({
    userId: z.string(), categorie: z.string(), typeNotif: z.string(),
    titre: z.string(), message: z.string().optional(), lien: z.string().optional(),
    icone: z.string().optional(), couleur: z.string().optional(),
  }))
  .handler(async ({ data }) => {
    try {
      const rows = await query<DbNotification>`
        INSERT INTO public.notifications (user_id, categorie, type_notif, titre, message, lien, icone, couleur)
        VALUES (${data.userId}, ${data.categorie}, ${data.typeNotif}, ${data.titre}, ${data.message ?? ''}, ${data.lien ?? null}, ${data.icone ?? 'bell'}, ${data.couleur ?? 'default'})
        RETURNING *
      `;
      return rows[0] ?? null;
    } catch (e) { throw AppError.from(e); }
  });

export const markNotificationRead = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string() }))
  .handler(async ({ data }) => {
    try {
      await query`UPDATE public.notifications SET est_lu = true, date_lecture = now() WHERE id = ${data.id}`;
      return { success: true };
    } catch (e) { throw AppError.from(e); }
  });

export const markAllNotificationsRead = createServerFn({ method: "POST" })
  .validator(z.object({ userId: z.string() }))
  .handler(async ({ data }) => {
    try {
      await query`UPDATE public.notifications SET est_lu = true, date_lecture = now() WHERE user_id = ${data.userId} AND est_lu = false`;
      return { success: true };
    } catch (e) { throw AppError.from(e); }
  });

export const getOrderFacture = createServerFn({ method: "GET" })
  .validator(z.object({ orderId: z.string() }))
  .handler(async ({ data }) => {
    try {
      const rows = await query<DbFacture>`SELECT * FROM public.factures WHERE order_id = ${data.orderId}`;
      return rows[0] ?? null;
    } catch (e) { throw AppError.from(e); }
  });

export const createFacture = createServerFn({ method: "POST" })
  .validator(z.object({ orderId: z.string(), numeroFacture: z.string(), qrCode: z.string().optional() }))
  .handler(async ({ data }) => {
    try {
      const rows = await query<DbFacture>`
        INSERT INTO public.factures (order_id, numero_facture, qr_code)
        VALUES (${data.orderId}, ${data.numeroFacture}, ${data.qrCode ?? ''})
        RETURNING *
      `;
      return rows[0] ?? null;
    } catch (e) { throw AppError.from(e); }
  });

export const getArtisanReversements = createServerFn({ method: "GET" })
  .validator(z.object({ artisanId: z.string() }))
  .handler(async ({ data }) => {
    try {
      const rows = await query<DbReversement>`
        SELECT r.*, o.order_number, o.total
        FROM public.reversements_artisan r
        JOIN public.orders o ON o.id = r.order_id
        WHERE r.artisan_id = ${data.artisanId}
        ORDER BY r.created_at DESC
      `;
      return rows;
    } catch (e) { throw AppError.from(e); }
  });

export const createReversement = createServerFn({ method: "POST" })
  .validator(z.object({
    orderId: z.string(), artisanId: z.string(),
    montantBrut: z.number(), commission: z.number(), montantNet: z.number(),
  }))
  .handler(async ({ data }) => {
    try {
      const rows = await query<DbReversement>`
        INSERT INTO public.reversements_artisan (order_id, artisan_id, montant_brut, commission, montant_net)
        VALUES (${data.orderId}, ${data.artisanId}, ${data.montantBrut}, ${data.commission}, ${data.montantNet})
        RETURNING *
      `;
      return rows[0] ?? null;
    } catch (e) { throw AppError.from(e); }
  });

export const getArtisanDemandesPaiement = createServerFn({ method: "GET" })
  .validator(z.object({ artisanId: z.string() }))
  .handler(async ({ data }) => {
    try {
      return await query<DbDemandePaiement>`SELECT * FROM public.demandes_paiement WHERE artisan_id = ${data.artisanId} ORDER BY date_demande DESC`;
    } catch (e) { throw AppError.from(e); }
  });

export const createDemandePaiement = createServerFn({ method: "POST" })
  .validator(z.object({
    artisanId: z.string(), montant: z.number(), hubId: z.string().optional(),
    modePaiementArtisan: z.string().optional(), referenceMm: z.string().optional(),
    titulaireMm: z.string().optional(),
  }))
  .handler(async ({ data }) => {
    try {
      const rows = await query<DbDemandePaiement>`
        INSERT INTO public.demandes_paiement (artisan_id, montant, hub_id, mode_paiement_artisan, reference_mm, titulaire_mm)
        VALUES (${data.artisanId}, ${data.montant}, ${data.hubId ?? null}, ${data.modePaiementArtisan ?? ''}, ${data.referenceMm ?? ''}, ${data.titulaireMm ?? ''})
        RETURNING *
      `;
      return rows[0] ?? null;
    } catch (e) { throw AppError.from(e); }
  });

export const updateDemandePaiementStatus = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string(), statut: z.string(), referencePaiement: z.string().optional() }))
  .handler(async ({ data }) => {
    try {
      const now = new Date().toISOString();
      if (data.statut === 'paid') {
        await query`UPDATE public.demandes_paiement SET statut = ${data.statut}, date_paiement = ${now}, reference_paiement = ${data.referencePaiement ?? ''} WHERE id = ${data.id}`;
      } else {
        await query`UPDATE public.demandes_paiement SET statut = ${data.statut} WHERE id = ${data.id}`;
      }
      return { success: true };
    } catch (e) { throw AppError.from(e); }
  });

export const getActiveCartSession = createServerFn({ method: "GET" })
  .validator(z.object({ userId: z.string() }))
  .handler(async ({ data }) => {
    try {
      const rows = await query<DbCartSession>`SELECT * FROM public.cart_sessions WHERE user_id = ${data.userId} AND statut = 'active' ORDER BY created_at DESC LIMIT 1`;
      return rows[0] ?? null;
    } catch (e) { throw AppError.from(e); }
  });

export const createCartSession = createServerFn({ method: "POST" })
  .validator(z.object({ userId: z.string() }))
  .handler(async ({ data }) => {
    try {
      const rows = await query<DbCartSession>`INSERT INTO public.cart_sessions (user_id, statut) VALUES (${data.userId}, 'active') RETURNING *`;
      return rows[0] ?? null;
    } catch (e) { throw AppError.from(e); }
  });

export const convertCartSession = createServerFn({ method: "POST" })
  .validator(z.object({ sessionId: z.string() }))
  .handler(async ({ data }) => {
    try {
      await query`UPDATE public.cart_sessions SET statut = 'converted' WHERE id = ${data.sessionId}`;
      return { success: true };
    } catch (e) { throw AppError.from(e); }
  });

export const getProductVariations = createServerFn({ method: "GET" })
  .validator(z.object({ productId: z.string() }))
  .handler(async ({ data }) => {
    try {
      return await query<DbProductVariation>`SELECT * FROM public.product_variations WHERE product_id = ${data.productId} ORDER BY prix ASC`;
    } catch (e) { throw AppError.from(e); }
  });

export const createProductVariation = createServerFn({ method: "POST" })
  .validator(z.object({
    productId: z.string(), couleur: z.string().optional(), couleurNom: z.string().optional(),
    taille: z.string().optional(), typeMesure: z.string().optional(),
    poids: z.number().optional(), prix: z.number(), stock: z.number().optional(),
    seuilAlerte: z.number().optional(), remise: z.number().optional(),
  }))
  .handler(async ({ data }) => {
    try {
      const rows = await query<DbProductVariation>`
        INSERT INTO public.product_variations (product_id, couleur, couleur_nom, taille, type_mesure, poids, prix, stock, seuil_alerte, remise)
        VALUES (${data.productId}, ${data.couleur ?? null}, ${data.couleurNom ?? null}, ${data.taille ?? null}, ${data.typeMesure ?? null}, ${data.poids ?? 0}, ${data.prix}, ${data.stock ?? 0}, ${data.seuilAlerte ?? 5}, ${data.remise ?? null})
        RETURNING *
      `;
      return rows[0] ?? null;
    } catch (e) { throw AppError.from(e); }
  });

export const updateVariationStock = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string(), stock: z.number() }))
  .handler(async ({ data }) => {
    try {
      await query`UPDATE public.product_variations SET stock = ${data.stock} WHERE id = ${data.id}`;
      return { success: true };
    } catch (e) { throw AppError.from(e); }
  });

export const getProductImages = createServerFn({ method: "GET" })
  .validator(z.object({ productId: z.string() }))
  .handler(async ({ data }) => {
    try {
      return await query<DbProductImage>`SELECT * FROM public.product_images WHERE product_id = ${data.productId} ORDER BY sort_order ASC`;
    } catch (e) { throw AppError.from(e); }
  });

export const addProductImage = createServerFn({ method: "POST" })
  .validator(z.object({ productId: z.string(), image: z.string(), sortOrder: z.number().optional() }))
  .handler(async ({ data }) => {
    try {
      const rows = await query<DbProductImage>`
        INSERT INTO public.product_images (product_id, image, sort_order)
        VALUES (${data.productId}, ${data.image}, ${data.sortOrder ?? 0})
        RETURNING *
      `;
      return rows[0] ?? null;
    } catch (e) { throw AppError.from(e); }
  });

export const getCategoriesFull = createServerFn({ method: "GET" })
  .handler(async () => {
    try {
      return await query<DbCategory>`SELECT * FROM public.categories ORDER BY nom ASC`;
    } catch (e) { throw AppError.from(e); }
  });

export const createCategory = createServerFn({ method: "POST" })
  .validator(z.object({ nom: z.string(), description: z.string().optional(), image: z.string().optional() }))
  .handler(async ({ data }) => {
    try {
      const rows = await query<DbCategory>`
        INSERT INTO public.categories (nom, description, image)
        VALUES (${data.nom}, ${data.description ?? ''}, ${data.image ?? null})
        RETURNING *
      `;
      return rows[0] ?? null;
    } catch (e) { throw AppError.from(e); }
  });

export const updateCategory = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string(), nom: z.string().optional(), description: z.string().optional(), image: z.string().optional() }))
  .handler(async ({ data }) => {
    try {
      const sets: string[] = []; const params: (string | number | boolean)[] = []; let idx = 1;
      if (data.nom !== undefined) { sets.push(`nom = $${idx}`); params.push(data.nom); idx++; }
      if (data.description !== undefined) { sets.push(`description = $${idx}`); params.push(data.description); idx++; }
      if (data.image !== undefined) { sets.push(`image = $${idx}`); params.push(data.image); idx++; }
      if (sets.length === 0) return null;
      params.push(data.id);
      await unsafeQuery(`UPDATE public.categories SET ${sets.join(", ")} WHERE id = $${idx}`, params);
      return { success: true };
    } catch (e) { throw AppError.from(e); }
  });

export const deleteCategory = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string() }))
  .handler(async ({ data }) => {
    try {
      await query`DELETE FROM public.categories WHERE id = ${data.id}`;
      return { success: true };
    } catch (e) { throw AppError.from(e); }
  });

export const getAllOrders = createServerFn({ method: "GET" })
  .handler(async () => {
    try {
      return await query<DbOrder>`SELECT * FROM public.orders ORDER BY created_at DESC LIMIT 200`;
    } catch (e) { throw AppError.from(e); }
  });

export const getAllDemandesPaiement = createServerFn({ method: "GET" })
  .handler(async () => {
    try {
      return await query<DbDemandePaiement>`
        SELECT dp.*, u.full_name AS artisan_nom, h.nom AS hub_nom
        FROM public.demandes_paiement dp
        LEFT JOIN public.users u ON u.id = dp.artisan_id
        LEFT JOIN public.hubs h ON h.id = dp.hub_id
        ORDER BY dp.date_demande DESC
      `;
    } catch (e) { throw AppError.from(e); }
  });

export const getAdminStats = createServerFn({ method: "GET" })
  .handler(async () => {
    try {
      const users = await query<{ count: number }>`SELECT COUNT(*) as count FROM public.users`;
      const products = await query<{ count: number }>`SELECT COUNT(*) as count FROM public.products`;
      const orders = await query<{ count: number }>`SELECT COUNT(*) as count FROM public.orders`;
      const revenue = await query<{ total: number }>`SELECT COALESCE(SUM(total), 0) as total FROM public.orders WHERE status IN ('delivered', 'shipped', 'paid')`;
      const artisans = await query<{ count: number }>`SELECT COUNT(*) as count FROM public.artisans`;
      const hubs = await query<{ count: number }>`SELECT COUNT(*) as count FROM public.hubs`;
      const ordersByStatus = await query<{ status: string; count: number }>`SELECT status, COUNT(*) as count FROM public.orders GROUP BY status ORDER BY status`;

      const response: StatsResponse = {
        users: Number(users[0]?.count ?? 0),
        products: Number(products[0]?.count ?? 0),
        orders: Number(orders[0]?.count ?? 0),
        revenue: Number(revenue[0]?.total ?? 0),
        artisans: Number(artisans[0]?.count ?? 0),
        hubs: Number(hubs[0]?.count ?? 0),
        ordersByStatus,
      };
      return response;
    } catch (e) { throw AppError.from(e); }
  });

export const getAllUsers = createServerFn({ method: "GET" })
  .handler(async () => {
    try {
      const rows = await query<UserWithRoles>`
        SELECT u.id, u.email, u.full_name, u.phone, u.country, u.is_active, u.created_at,
          COALESCE(json_agg(DISTINCT ur.role) FILTER (WHERE ur.role IS NOT NULL), '[]') as roles
        FROM public.users u
        LEFT JOIN public.user_roles ur ON ur.user_id = u.id
        GROUP BY u.id
        ORDER BY u.created_at DESC LIMIT 100
      `;
      return rows;
    } catch (e) { throw AppError.from(e); }
  });

export const updateUserRole = createServerFn({ method: "POST" })
  .validator(z.object({ userId: z.string(), role: z.string(), add: z.boolean() }))
  .handler(async ({ data }) => {
    try {
      if (data.add) {
        await query`
          INSERT INTO public.user_roles (user_id, role) VALUES (${data.userId}, ${data.role}) ON CONFLICT (user_id, role) DO NOTHING
        `;
      } else {
        await query`DELETE FROM public.user_roles WHERE user_id = ${data.userId} AND role = ${data.role}`;
      }
      return { success: true };
    } catch (e) { throw AppError.from(e); }
  });

const VALID_TRANSITIONS: Record<string, string[]> = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['awaiting_payment', 'preparing', 'cancelled'],
  awaiting_payment: ['paid', 'cancelled'],
  paid: ['preparing', 'cancelled'],
  preparing: ['prete', 'cancelled'],
  prete: ['shipped', 'cancelled'],
  shipped: ['in_delivery', 'cancelled'],
  in_delivery: ['delivered', 'cancelled', 'returned', 'echec'],
  delivered: ['returned'],
  cancelled: [],
  returned: [],
  echec: [],
};

export const transitionOrderStatus = createServerFn({ method: "POST" })
  .validator(z.object({ orderId: z.string(), newStatus: z.string() }))
  .handler(async ({ data }) => {
    try {
      const orders = await query<DbOrder>`SELECT id, status FROM public.orders WHERE id = ${data.orderId}`;
      const order = orders[0];
      if (!order) return { error: "Commande introuvable" };

      const allowed = VALID_TRANSITIONS[order.status] ?? [];
      if (!allowed.includes(data.newStatus)) {
        return { error: `Transition invalide de "${order.status}" vers "${data.newStatus}"` };
      }

      const now = new Date().toISOString();
      const extraSets: string[] = [];
      if (data.newStatus === 'confirmed') extraSets.push("date_confirmation = $2");
      else if (data.newStatus === 'preparing') extraSets.push("date_preparation = $2");
      else if (data.newStatus === 'delivered') extraSets.push("date_livraison = $2");

      if (extraSets.length > 0) {
        await unsafeQuery(
          `UPDATE public.orders SET status = $1, ${extraSets.join(", ")} WHERE id = $3`,
          [data.newStatus, now, data.orderId]
        );
      } else {
        await query`UPDATE public.orders SET status = ${data.newStatus} WHERE id = ${data.orderId}`;
      }

      return { success: true, from: order.status, to: data.newStatus };
    } catch (e) { throw AppError.from(e); }
  });

export const createProduct = createServerFn({ method: "POST" })
  .validator(z.object({
    id: z.string(), name: z.string(), artisan: z.string(), country: z.string(),
    category: z.string(), material: z.string(), price: z.number(),
    description: z.string().optional(), image: z.string().optional(),
    fastShip: z.boolean().optional(), fairTrade: z.boolean().optional(),
    certified: z.boolean().optional(), userId: z.string().optional(),
  }))
  .handler(async ({ data }) => {
    try {
      const rows = await query<DbProduct>`
        INSERT INTO public.products (id, name, artisan, country, category, material, price, description, image, fast_ship, fair_trade, certified, user_id)
        VALUES (${data.id}, ${data.name}, ${data.artisan}, ${data.country}, ${data.category}, ${data.material}, ${data.price}, ${data.description ?? ''}, ${data.image ?? null}, ${data.fastShip ?? false}, ${data.fairTrade ?? false}, ${data.certified ?? false}, ${data.userId ?? null})
        RETURNING *
      `;
      return rows[0] ?? null;
    } catch (e) { throw AppError.from(e); }
  });

export const updateProduct = createServerFn({ method: "POST" })
  .validator(z.object({
    id: z.string(), name: z.string().optional(), price: z.number().optional(),
    description: z.string().optional(), category: z.string().optional(),
    material: z.string().optional(), fastShip: z.boolean().optional(),
    fairTrade: z.boolean().optional(), certified: z.boolean().optional(),
    statut: z.string().optional(),
  }))
  .handler(async ({ data }) => {
    try {
      const sets: string[] = [];
      const params: (string | number | boolean)[] = [];
      let idx = 1;
      if (data.name !== undefined) { sets.push(`name = $${idx}`); params.push(data.name); idx++; }
      if (data.price !== undefined) { sets.push(`price = $${idx}`); params.push(data.price); idx++; }
      if (data.description !== undefined) { sets.push(`description = $${idx}`); params.push(data.description); idx++; }
      if (data.category !== undefined) { sets.push(`category = $${idx}`); params.push(data.category); idx++; }
      if (data.material !== undefined) { sets.push(`material = $${idx}`); params.push(data.material); idx++; }
      if (data.fastShip !== undefined) { sets.push(`fast_ship = $${idx}`); params.push(data.fastShip); idx++; }
      if (data.fairTrade !== undefined) { sets.push(`fair_trade = $${idx}`); params.push(data.fairTrade); idx++; }
      if (data.certified !== undefined) { sets.push(`certified = $${idx}`); params.push(data.certified); idx++; }
      if (data.statut !== undefined) { sets.push(`statut = $${idx}`); params.push(data.statut); idx++; }
      if (sets.length === 0) return null;
      params.push(data.id);
      await unsafeQuery(`UPDATE public.products SET ${sets.join(", ")} WHERE id = $${idx}`, params);
      return { success: true };
    } catch (e) { throw AppError.from(e); }
  });

export const deleteProduct = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string() }))
  .handler(async ({ data }) => {
    try {
      await query`DELETE FROM public.products WHERE id = ${data.id}`;
      return { success: true };
    } catch (e) { throw AppError.from(e); }
  });

export const runCronAutoCancelUnpaid = createServerFn({ method: "POST" })
  .handler(async () => {
    try {
      const { autoCancelUnpaidOrders } = await import("../services/order-workflow");
      return await autoCancelUnpaidOrders();
    } catch (e) { throw AppError.from(e); }
  });

export const runCronReactivateProducts = createServerFn({ method: "POST" })
  .handler(async () => {
    try {
      const { autoReactivateProducts } = await import("../services/order-workflow");
      return await autoReactivateProducts();
    } catch (e) { throw AppError.from(e); }
  });

export const runCronReactivateUsers = createServerFn({ method: "POST" })
  .handler(async () => {
    try {
      const { autoReactivateUsers } = await import("../services/order-workflow");
      return await autoReactivateUsers();
    } catch (e) { throw AppError.from(e); }
  });

export const runCronLowStock = createServerFn({ method: "POST" })
  .handler(async () => {
    try {
      const { checkLowStock } = await import("../services/order-workflow");
      return await checkLowStock();
    } catch (e) { throw AppError.from(e); }
  });

export const getLivreurDashboardStats = createServerFn({ method: "GET" })
  .validator(z.object({ livreurId: z.string() }))
  .handler(async ({ data }) => {
    try {
      const { getLivreurDashboard } = await import("../services/hub-logistics.service");
      return await getLivreurDashboard(data.livreurId);
    } catch (e) { throw AppError.from(e); }
  });

export const getArtisanOrderStats = createServerFn({ method: "GET" })
  .validator(z.object({ artisanId: z.string() }))
  .handler(async ({ data }) => {
    try {
      const { getArtisanOrdersStats } = await import("../services/artisan-payment.service");
      return await getArtisanOrdersStats(data.artisanId);
    } catch (e) { throw AppError.from(e); }
  });

export const createArtisanReversement = createServerFn({ method: "POST" })
  .validator(z.object({ orderId: z.string(), artisanId: z.string(), montantBrut: z.number() }))
  .handler(async ({ data }) => {
    try {
      const { createReversement } = await import("../services/artisan-payment.service");
      return await createReversement(data.orderId, data.artisanId, data.montantBrut);
    } catch (e) { throw AppError.from(e); }
  });

export const createArtisanDemandePaiement = createServerFn({ method: "POST" })
  .validator(z.object({
    artisanId: z.string(), montant: z.number(),
    hubId: z.string().optional(), modePaiement: z.string().optional(),
    referenceMm: z.string().optional(), titulaireMm: z.string().optional(),
  }))
  .handler(async ({ data }) => {
    try {
      const { createDemandePaiement } = await import("../services/artisan-payment.service");
      return await createDemandePaiement(data.artisanId, data.montant, data.hubId, data.modePaiement, data.referenceMm, data.titulaireMm);
    } catch (e) { throw AppError.from(e); }
  });

export const getArtisanBalance = createServerFn({ method: "GET" })
  .validator(z.object({ artisanId: z.string() }))
  .handler(async ({ data }) => {
    try {
      const { calculateArtisanBalance } = await import("../services/artisan-payment.service");
      return { balance: await calculateArtisanBalance(data.artisanId) };
    } catch (e) { throw AppError.from(e); }
  });

export const getHubsWithStats = createServerFn({ method: "GET" })
  .handler(async () => {
    try {
      const { getHubsWithStats } = await import("../services/hub-logistics.service");
      return await getHubsWithStats();
    } catch (e) { throw AppError.from(e); }
  });

export const getZonesByVille = createServerFn({ method: "GET" })
  .validator(z.object({ ville: z.string() }))
  .handler(async ({ data }) => {
    try {
      const { getZonesByVille } = await import("../services/hub-logistics.service");
      return await getZonesByVille(data.ville);
    } catch (e) { throw AppError.from(e); }
  });

export const createFullOrderWithWorkflow = createServerFn({ method: "POST" })
  .validator(z.object({
    userId: z.string(), subtotal: z.number(), total: z.number(),
    paymentMethod: z.string(), shippingAddress: z.any(),
    region: z.string().optional(), city: z.string().optional(),
    items: z.array(z.object({
      product_id: z.string(), product_name: z.string(),
      product_image: z.string().nullable(), artisan_name: z.string().nullable(),
      unit_price: z.number(), quantity: z.number(),
    })),
  }))
  .handler(async ({ data }) => {
    try {
      const { assignHubDestination, determinePaymentMethod, createOrderLivraisonPlaceholder } = await import("../services/hub-logistics.service");

      const pm = (await determinePaymentMethod(data.region, data.city)).toUpperCase();
      const hub = await assignHubDestination(data.region, data.city);

      const orderRows = await query<DbOrder>`
        INSERT INTO public.orders (user_id, status, subtotal, shipping, total, currency, payment_method, shipping_address, region)
        VALUES (${data.userId}, 'pending', ${data.subtotal}, 0, ${data.total}, 'EUR', ${pm}, ${JSON.stringify(data.shippingAddress)}, ${data.region ?? ''})
        RETURNING *
      `;
      const order = orderRows[0];

      for (const item of data.items) {
        await query`
          INSERT INTO public.order_items (order_id, product_id, product_name, product_image, artisan_name, unit_price, quantity, line_total)
          VALUES (${order.id}, ${item.product_id}, ${item.product_name}, ${item.product_image}, ${item.artisan_name}, ${item.unit_price}, ${item.quantity}, ${item.unit_price * item.quantity})
        `;
      }

      if (hub) {
        await createOrderLivraisonPlaceholder(order.id, null, hub.id);
      }

      await query`DELETE FROM public.cart_items WHERE user_id = ${data.userId}`;
      return order;
    } catch (e) { throw AppError.from(e); }
  });

export const globalSearch = createServerFn({ method: "GET" })
  .validator(z.object({ q: z.string().min(1) }))
  .handler(async ({ data }) => {
    try {
      const like = `%${data.q.toLowerCase()}%`;
      const products = await unsafeQuery<{ id: string; name: string; type: string; image?: string; info?: string }>(
        `SELECT id, name, 'product' as type, image, price as info FROM public.products WHERE LOWER(name) LIKE $1 OR LOWER(artisan) LIKE $1 OR LOWER(category) LIKE $1 LIMIT 5`, [like]
      );
      const artisans = await unsafeQuery<{ id: string; name: string; type: string; image?: string; info?: string }>(
        `SELECT id, name, 'artisan' as type, image, specialty as info FROM public.artisans WHERE LOWER(name) LIKE $1 OR LOWER(specialty) LIKE $1 LIMIT 5`, [like]
      );
      const articles = await unsafeQuery<{ id: string; name: string; type: string; image?: string; info?: string }>(
        `SELECT id, title as name, 'article' as type, image, category as info FROM public.articles WHERE LOWER(title) LIKE $1 OR LOWER(category) LIKE $1 LIMIT 5`, [like]
      );

      const result: GlobalSearchResult = { products, artisans, articles };
      return result;
    } catch (e) { throw AppError.from(e); }
  });

export const getAllReviews = createServerFn({ method: "GET" })
  .handler(async () => {
    try {
      const rows = await query<ReviewWithProduct>`
        SELECT r.*, u.full_name AS user_name, p.name AS product_name, p.image AS product_image
        FROM public.reviews r
        LEFT JOIN public.users u ON u.id = r.user_id
        LEFT JOIN public.products p ON p.id = r.product_id
        ORDER BY r.created_at DESC LIMIT 200
      `;
      return rows;
    } catch (e) { throw AppError.from(e); }
  });

export const deleteReview = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string() }))
  .handler(async ({ data }) => {
    try {
      await query`DELETE FROM public.reviews WHERE id = ${data.id}`;
      return { success: true };
    } catch (e) { throw AppError.from(e); }
  });

export const getAllNotificationsAdmin = createServerFn({ method: "GET" })
  .handler(async () => {
    try {
      const rows = await query<NotificationWithUser>`
        SELECT n.*, u.email AS user_email, u.full_name AS user_name
        FROM public.notifications n
        LEFT JOIN public.users u ON u.id = n.user_id
        ORDER BY n.created_at DESC LIMIT 200
      `;
      return rows;
    } catch (e) { throw AppError.from(e); }
  });

export const sendBulkNotification = createServerFn({ method: "POST" })
  .validator(z.object({
    titre: z.string(), message: z.string().optional(),
    categorie: z.string().default("systeme"), typeNotif: z.string().default("info"),
    lien: z.string().optional(), targetRole: z.string().optional(),
  }))
  .handler(async ({ data }) => {
    try {
      let users: { id: string }[];
      if (data.targetRole) {
        users = await query`
          SELECT u.id FROM public.users u
          JOIN public.user_roles r ON r.user_id = u.id
          WHERE r.role = ${data.targetRole}::public.app_role
        `;
      } else {
        users = await query`SELECT id FROM public.users`;
      }
      for (const u of users) {
        await query`
          INSERT INTO public.notifications (user_id, categorie, type_notif, titre, message, lien)
          VALUES (${u.id}, ${data.categorie}, ${data.typeNotif}, ${data.titre}, ${data.message ?? ''}, ${data.lien ?? null})
        `;
      }
      return { success: true, count: users.length };
    } catch (e) { throw AppError.from(e); }
  });

export const getSalesAnalytics = createServerFn({ method: "GET" })
  .handler(async () => {
    try {
      const daily = await query<{ date: string; orders: number; revenue: number }>`
        SELECT DATE(created_at) AS date, COUNT(*)::int AS orders, COALESCE(SUM(total),0) AS revenue
        FROM public.orders WHERE created_at >= NOW() - INTERVAL '30 days'
        GROUP BY DATE(created_at) ORDER BY date
      `;
      const weekly = await query<{ week: string; orders: number; revenue: number }>`
        SELECT TO_CHAR(DATE_TRUNC('week', created_at), 'YYYY-MM-DD') AS week,
               COUNT(*)::int AS orders, COALESCE(SUM(total),0) AS revenue
        FROM public.orders WHERE created_at >= NOW() - INTERVAL '90 days'
        GROUP BY DATE_TRUNC('week', created_at) ORDER BY week
      `;
      const monthly = await query<{ month: string; orders: number; revenue: number }>`
        SELECT TO_CHAR(DATE_TRUNC('month', created_at), 'YYYY-MM') AS month,
               COUNT(*)::int AS orders, COALESCE(SUM(total),0) AS revenue
        FROM public.orders WHERE created_at >= NOW() - INTERVAL '12 months'
        GROUP BY DATE_TRUNC('month', created_at) ORDER BY month
      `;
      const result: SalesAnalytics = { daily, weekly, monthly };
      return result;
    } catch (e) { throw AppError.from(e); }
  });

export const getTopProducts = createServerFn({ method: "GET" })
  .handler(async () => {
    try {
      const rows = await query<TopProduct>`
        SELECT oi.product_id AS id, oi.product_name AS name,
               SUM(oi.quantity)::int AS total_sold,
               SUM(oi.line_total) AS total_revenue
        FROM public.order_items oi
        JOIN public.orders o ON o.id = oi.order_id
        WHERE o.status IN ('delivered','shipped','paid')
        GROUP BY oi.product_id, oi.product_name
        ORDER BY total_sold DESC LIMIT 20
      `;
      return rows;
    } catch (e) { throw AppError.from(e); }
  });

export const getRevenueChart = createServerFn({ method: "GET" })
  .handler(async () => {
    try {
      const rows = await query<RevenuePoint>`
        SELECT TO_CHAR(DATE_TRUNC('month', created_at), 'YYYY-MM') AS month,
               COALESCE(SUM(total),0) AS revenue,
               COUNT(*)::int AS orders
        FROM public.orders WHERE status != 'cancelled'
        GROUP BY DATE_TRUNC('month', created_at)
        ORDER BY month ASC LIMIT 12
      `;
      return rows;
    } catch (e) { throw AppError.from(e); }
  });

export const getLowStockProducts = createServerFn({ method: "GET" })
  .handler(async () => {
    try {
      const rows = await query<LowStockItem>`
        SELECT pv.id, pv.product_id, p.name AS product_name,
               pv.couleur, pv.taille, pv.stock, pv.seuil_alerte
        FROM public.product_variations pv
        JOIN public.products p ON p.id = pv.product_id
        WHERE pv.stock <= pv.seuil_alerte
        ORDER BY pv.stock ASC LIMIT 50
      `;
      return rows;
    } catch (e) { throw AppError.from(e); }
  });

export const getRecentActivity = createServerFn({ method: "GET" })
  .handler(async () => {
    try {
      const sessions = await query<ActivityEntry>`
        SELECT s.id, 'session' AS type, 'Connexion' AS description,
               u.full_name AS user_name, u.email AS user_email, s.created_at
        FROM public.sessions s
        JOIN public.users u ON u.id = s.user_id
        ORDER BY s.created_at DESC LIMIT 10
      `;
      const orders = await query<ActivityEntry>`
        SELECT o.id, 'order' AS type,
               'Commande ' || o.order_number || ' - ' || o.status AS description,
               u.full_name AS user_name, u.email AS user_email, o.created_at
        FROM public.orders o
        JOIN public.users u ON u.id = o.user_id
        ORDER BY o.created_at DESC LIMIT 10
      `;
      const users = await query<ActivityEntry>`
        SELECT u.id, 'user' AS type, 'Inscription' AS description,
               u.full_name AS user_name, u.email AS user_email, u.created_at
        FROM public.users u
        ORDER BY u.created_at DESC LIMIT 10
      `;
      const combined = [...sessions, ...orders, ...users]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 30);
      return combined;
    } catch (e) { throw AppError.from(e); }
  });

export const getAllShipments = createServerFn({ method: "GET" })
  .handler(async () => {
    try {
      const livraisons = await query<DbLivraison>`
        SELECT l.*, o.order_number, o.status AS order_status
        FROM public.livraisons l
        JOIN public.orders o ON o.id = l.order_id
        ORDER BY l.created_at DESC LIMIT 100
      `;
      return livraisons;
    } catch (e) { throw AppError.from(e); }
  });

export const getDashboardAlerts = createServerFn({ method: "GET" })
  .handler(async () => {
    try {
      const pendingOrders = await query<{ count: number }>`SELECT COUNT(*)::int AS count FROM public.orders WHERE status = 'pending'`;
      const pendingPayments = await query<{ count: number }>`SELECT COUNT(*)::int AS count FROM public.demandes_paiement WHERE statut = 'pending'`;
      const lowStock = await query<{ count: number }>`SELECT COUNT(*)::int AS count FROM public.product_variations pv WHERE pv.stock <= pv.seuil_alerte`;
      const unreadNotifs = await query<{ count: number }>`SELECT COUNT(*)::int AS count FROM public.notifications WHERE est_lu = false`;
      return {
        pendingOrders: Number(pendingOrders[0]?.count ?? 0),
        pendingPayments: Number(pendingPayments[0]?.count ?? 0),
        lowStockItems: Number(lowStock[0]?.count ?? 0),
        unreadNotifications: Number(unreadNotifs[0]?.count ?? 0),
      };
    } catch (e) { throw AppError.from(e); }
  });

export const getUsersPaginated = createServerFn({ method: "GET" })
  .validator(z.object({ page: z.number().default(1), limit: z.number().default(20), search: z.string().optional(), roleFilter: z.string().optional() }))
  .handler(async ({ data }) => {
    try {
      const offset = (data.page - 1) * data.limit;
      const conditions: string[] = [];
      const params: (string | number)[] = [];
      let idx = 1;
      if (data.search) {
        conditions.push(`(LOWER(u.full_name) LIKE $${idx} OR LOWER(u.email) LIKE $${idx})`);
        params.push(`%${data.search.toLowerCase()}%`);
        idx++;
      }
      if (data.roleFilter) {
        conditions.push(`ur.role = $${idx}::public.app_role`);
        params.push(data.roleFilter);
        idx++;
      }
      const fromClause = data.roleFilter
        ? `FROM public.users u JOIN public.user_roles ur ON ur.user_id = u.id`
        : `FROM public.users u`;
      const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
      const countRows = await unsafeQuery<{ count: number }>(`SELECT COUNT(*)::int AS cnt ${fromClause} ${where}`, params);
      const total = Number(countRows[0]?.cnt ?? 0);

      let sql: string;
      if (data.roleFilter) {
        sql = `SELECT u.id, u.email, u.full_name, u.phone, u.country, u.is_active, u.created_at, COALESCE((SELECT json_agg(r2.role) FROM public.user_roles r2 WHERE r2.user_id = u.id), '[]') as roles ${fromClause} ${where} GROUP BY u.id ORDER BY u.created_at DESC LIMIT $${idx} OFFSET $${idx + 1}`;
      } else {
        sql = `SELECT u.id, u.email, u.full_name, u.phone, u.country, u.is_active, u.created_at, COALESCE(json_agg(DISTINCT ur.role) FILTER (WHERE ur.role IS NOT NULL), '[]') as roles ${fromClause} LEFT JOIN public.user_roles ur ON ur.user_id = u.id ${where} GROUP BY u.id ORDER BY u.created_at DESC LIMIT $${idx} OFFSET $${idx + 1}`;
      }
      params.push(data.limit, offset);
      const rows = await unsafeQuery<UserWithRoles>(sql, params);
      return { data: rows, total, page: data.page, totalPages: Math.ceil(total / data.limit) };
    } catch (e) { throw AppError.from(e); }
  });

export const getOrdersPaginated = createServerFn({ method: "GET" })
  .validator(z.object({ page: z.number().default(1), limit: z.number().default(20), filter: z.string().optional(), search: z.string().optional() }))
  .handler(async ({ data }) => {
    try {
      const offset = (data.page - 1) * data.limit;
      const conditions: string[] = [];
      const params: (string | number)[] = [];
      let idx = 1;
      if (data.filter) { conditions.push(`status = $${idx}`); params.push(data.filter); idx++; }
      if (data.search) {
        conditions.push(`(order_number ILIKE $${idx} OR id ILIKE $${idx})`);
        params.push(`%${data.search}%`);
        idx++;
      }
      const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
      const countRows = await unsafeQuery<{ count: number }>(`SELECT COUNT(*)::int AS count FROM public.orders ${where}`, params);
      const total = Number(countRows[0]?.count ?? 0);
      params.push(data.limit, offset);
      const rows = await unsafeQuery<DbOrder>(`SELECT * FROM public.orders ${where} ORDER BY created_at DESC LIMIT $${idx} OFFSET $${idx + 1}`, params);
      return { data: rows, total, page: data.page, totalPages: Math.ceil(total / data.limit) };
    } catch (e) { throw AppError.from(e); }
  });

export const getProductsPaginated = createServerFn({ method: "GET" })
  .validator(z.object({
    page: z.number().default(1), limit: z.number().default(20),
    search: z.string().optional(), filterCat: z.string().optional(),
    sort: z.enum(["new", "price-asc", "price-desc", "rating", "name"]).default("new"),
  }))
  .handler(async ({ data }) => {
    try {
      const offset = (data.page - 1) * data.limit;
      const conditions: string[] = [];
      const params: (string | number)[] = [];
      let idx = 1;
      if (data.search) {
        conditions.push(`(LOWER(p.name) LIKE $${idx} OR LOWER(p.artisan) LIKE $${idx})`);
        params.push(`%${data.search.toLowerCase()}%`);
        idx++;
      }
      if (data.filterCat) { conditions.push(`p.category = $${idx}`); params.push(data.filterCat); idx++; }
      const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
      const countRows = await unsafeQuery<{ count: number }>(`SELECT COUNT(*)::int AS count FROM public.products p ${where}`, params);
      const total = Number(countRows[0]?.count ?? 0);

      let orderBy = "p.created_at DESC";
      switch (data.sort) {
        case "price-asc": orderBy = "p.price ASC"; break;
        case "price-desc": orderBy = "p.price DESC"; break;
        case "rating": orderBy = "p.rating DESC"; break;
        case "name": orderBy = "p.name ASC"; break;
      }
      const rows = await unsafeQuery<DbProduct>(`SELECT ${PRODUCT_COLS.replace(/\n\s+/g, " ")} FROM public.products p ${where} ORDER BY ${orderBy} LIMIT $${idx} OFFSET $${idx + 1}`, [...params, data.limit, offset]);
      return { data: rows, total, page: data.page, totalPages: Math.ceil(total / data.limit) };
    } catch (e) { throw AppError.from(e); }
  });

export const getArtisanPromotions = createServerFn({ method: "GET" })
  .validator(z.object({ userId: z.string() }))
  .handler(async ({ data }) => {
    try {
      return await query<DbPromotion>`SELECT * FROM public.promotions WHERE user_id = ${data.userId} ORDER BY created_at DESC`;
    } catch (e) { throw AppError.from(e); }
  });

export const createPromotion = createServerFn({ method: "POST" })
  .validator(z.object({ userId: z.string(), code: z.string(), discount: z.number(), type: z.string(), maxUses: z.number().optional() }))
  .handler(async ({ data }) => {
    try {
      const existing = await query<DbPromotion>`SELECT id FROM public.promotions WHERE user_id = ${data.userId} AND code = ${data.code}`;
      if (existing.length > 0) return { error: "Ce code promo existe déjà" };
      const rows = await query<DbPromotion>`
        INSERT INTO public.promotions (user_id, code, discount, type, max_uses)
        VALUES (${data.userId}, ${data.code}, ${data.discount}, ${data.type}, ${data.maxUses ?? null})
        RETURNING *
      `;
      return rows[0] ?? null;
    } catch (e) { throw AppError.from(e); }
  });

export const togglePromotion = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string() }))
  .handler(async ({ data }) => {
    try {
      await query`UPDATE public.promotions SET active = NOT active WHERE id = ${data.id}`;
      return { success: true };
    } catch (e) { throw AppError.from(e); }
  });

export const deletePromotion = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string() }))
  .handler(async ({ data }) => {
    try {
      await query`DELETE FROM public.promotions WHERE id = ${data.id}`;
      return { success: true };
    } catch (e) { throw AppError.from(e); }
  });

export const getB2BProfile = createServerFn({ method: "GET" })
  .validator(z.object({ userId: z.string() }))
  .handler(async ({ data }) => {
    try {
      const rows = await query<B2BProfile>`SELECT * FROM public.b2b_profiles WHERE user_id = ${data.userId}`;
      return rows[0] ?? null;
    } catch (e) { throw AppError.from(e); }
  });

export const upsertB2BProfile = createServerFn({ method: "POST" })
  .validator(z.object({
    userId: z.string(), companyName: z.string(), siret: z.string(),
    moq: z.number(), volumeDiscount: z.number(), productionDelayDays: z.number(),
    incotermPreferred: z.string(),
  }))
  .handler(async ({ data }) => {
    try {
      const rows = await query<B2BProfile>`
        INSERT INTO public.b2b_profiles (user_id, company_name, siret, moq, volume_discount, production_delay_days, incoterm_preferred)
        VALUES (${data.userId}, ${data.companyName}, ${data.siret}, ${data.moq}, ${data.volumeDiscount}, ${data.productionDelayDays}, ${data.incotermPreferred})
        ON CONFLICT (user_id) DO UPDATE SET
          company_name = EXCLUDED.company_name, siret = EXCLUDED.siret, moq = EXCLUDED.moq,
          volume_discount = EXCLUDED.volume_discount, production_delay_days = EXCLUDED.production_delay_days,
          incoterm_preferred = EXCLUDED.incoterm_preferred, updated_at = now()
        RETURNING *
      `;
      return rows[0] ?? null;
    } catch (e) { throw AppError.from(e); }
  });

export const getUserProfile = createServerFn({ method: "GET" })
  .validator(z.object({ userId: z.string() }))
  .handler(async ({ data }) => {
    try {
      const rows = await query<{ id: string; email: string; full_name: string; phone: string; country: string; city: string; region: string; description: string; avatar_url: string; created_at: string }>`
        SELECT id, email, full_name, phone, country, city, region, description, avatar_url, created_at FROM public.users WHERE id = ${data.userId}
      `;
      return rows[0] ?? null;
    } catch (e) { throw AppError.from(e); }
  });

export const updateUserProfile = createServerFn({ method: "POST" })
  .validator(z.object({ userId: z.string(), fullName: z.string().optional(), phone: z.string().optional(), country: z.string().optional(), city: z.string().optional(), description: z.string().optional() }))
  .handler(async ({ data }) => {
    try {
      const sets: string[] = []; const params: (string | number)[] = []; let idx = 1;
      if (data.fullName !== undefined) { sets.push(`full_name = $${idx}`); params.push(data.fullName); idx++; }
      if (data.phone !== undefined) { sets.push(`phone = $${idx}`); params.push(data.phone); idx++; }
      if (data.country !== undefined) { sets.push(`country = $${idx}`); params.push(data.country); idx++; }
      if (data.city !== undefined) { sets.push(`city = $${idx}`); params.push(data.city); idx++; }
      if (data.description !== undefined) { sets.push(`description = $${idx}`); params.push(data.description); idx++; }
      if (sets.length === 0) return { error: "Aucun champ à mettre à jour" };
      params.push(data.userId);
      await unsafeQuery(`UPDATE public.users SET ${sets.join(", ")} WHERE id = $${idx}`, params);
      return { success: true };
    } catch (e) { throw AppError.from(e); }
  });

export const getUserUnreadCount = createServerFn({ method: "GET" })
  .validator(z.object({ userId: z.string() }))
  .handler(async ({ data }) => {
    try {
      const rows = await query<{ count: number }>`SELECT COUNT(*)::int AS count FROM public.notifications WHERE user_id = ${data.userId} AND est_lu = false`;
      return Number(rows[0]?.count ?? 0);
    } catch (e) { throw AppError.from(e); }
  });

export const getOrdersInDelivery = createServerFn({ method: "GET" })
  .handler(async () => {
    try {
      const rows = await query`
        SELECT o.id, o.order_number, o.status, o.total, o.created_at, o.payment_method,
               u.full_name AS user_name, u.email AS user_email
        FROM public.orders o
        LEFT JOIN public.users u ON u.id = o.user_id
        WHERE o.status IN ('in_delivery', 'shipped')
        ORDER BY o.created_at DESC LIMIT 100
      `;
      return rows;
    } catch (e) { throw AppError.from(e); }
  });
