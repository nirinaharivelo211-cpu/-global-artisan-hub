import type { Product as DataProduct } from "./data";

// ---- DB Row types ----

export type DbProduct = {
  id: string;
  name: string;
  artisan: string;
  country: string;
  category: string;
  material: string;
  price: number;
  rating: number;
  reviews: number;
  img: string;
  fastShip?: boolean;
  fairTrade?: boolean;
  certified?: boolean;
  isNew?: boolean;
  description?: string;
  image?: string;
  statut?: string;
  user_id?: string;
  created_at: string;
};

export type DbArtisan = {
  id: string;
  user_id?: string;
  name: string;
  specialty: string;
  country: string;
  city: string;
  rating: number;
  reviews: number;
  products: number;
  experience: number;
  certified: boolean;
  image?: string;
  bio?: string;
  adresse?: string;
  telephone?: string;
  email_contact?: string;
  site_web?: string;
  photo_couverture?: string;
  created_at?: string;
};

export type DbWorkshop = {
  id: string;
  title: string;
  location: string;
  duration: string;
  price: number;
  img: string;
  description: string;
  maxParticipants: number;
  image?: string;
  created_at: string;
};

export type DbArticle = {
  id: string;
  title: string;
  content?: string;
  excerpt?: string;
  category?: string;
  image?: string;
  author?: string;
  published_at: string;
  created_at: string;
};

export type DbUser = {
  id: string;
  email: string;
  full_name: string;
  phone?: string;
  country?: string;
  city?: string;
  language?: string;
  currency?: string;
  is_active?: boolean;
  password_hash?: string;
  created_at: string;
};

export type DbSession = {
  id: string;
  user_id: string;
  token: string;
  expires_at: string;
  created_at: string;
};

export type DbUserRole = {
  id: string;
  user_id: string;
  role: "admin" | "artisan" | "manager" | "livreur" | "client";
};

export type DbOrder = {
  id: string;
  order_number?: string;
  user_id: string;
  status: string;
  subtotal: number;
  shipping: number;
  total: number;
  currency: string;
  payment_method: string;
  shipping_address: Record<string, unknown>;
  carrier?: string;
  region?: string;
  date_creation?: string;
  date_confirmation?: string;
  date_preparation?: string;
  date_livraison?: string;
  created_at: string;
};

export type DbCartItem = {
  id: string;
  user_id: string;
  product_id: string;
  product_name: string;
  product_image: string | null;
  artisan_name: string | null;
  unit_price: number;
  quantity: number;
  created_at: string;
};

export type DbOrderItem = {
  id: string;
  order_id: string;
  product_id: string;
  product_name: string;
  product_image?: string | null;
  artisan_name?: string | null;
  unit_price: number;
  quantity: number;
  line_total: number;
};

export type DbBooking = {
  id: string;
  user_id: string;
  workshop_id: string;
  workshop_title: string;
  workshop_location?: string | null;
  workshop_image?: string | null;
  booking_date: string;
  participants: number;
  unit_price: number;
  total: number;
  currency: string;
  notes?: string | null;
  status: string;
  created_at: string;
};

export type DbReview = {
  id: string;
  user_id: string;
  product_id: string;
  rating: number;
  comment?: string;
  created_at: string;
  user_name?: string;
};

export type DbHub = {
  id: string;
  nom: string;
  region: string;
  ville: string;
  adresse?: string;
  contact?: string;
  telephone?: string;
  gestionnaire_id?: string;
  prix_par_km?: number;
  prix_par_kg?: number;
  actif?: boolean;
  support_cod?: boolean;
  mvola_number?: string;
  orange_money_number?: string;
  airtel_money_number?: string;
  created_at: string;
};

export type DbZoneLivraison = {
  id: string;
  hub_id: string;
  nom: string;
  ville?: string;
  distance_km?: number;
  delai_estime_jours?: number;
  actif?: boolean;
  created_at: string;
};

export type DbLivraison = {
  id: string;
  order_id: string;
  livreur_id?: string;
  hub_source_id?: string;
  hub_destination_id?: string;
  zone_livraison_id?: string;
  date_prevue: string;
  montant_du: number;
  montant_encaisse?: number;
  mode_paiement?: string;
  statut_paiement?: string;
  created_at: string;
  order_number?: string;
  order_status?: string;
};

export type DbColis = {
  id: string;
  order_id: string;
  artisan_id?: string;
  mode?: string;
  cooperative_nom?: string;
  lieu_depart?: string;
  statut?: string;
  submitted_at?: string;
  collected_at?: string;
  collected_by?: string;
  tracking_number?: string;
  created_at: string;
  artisan_name?: string;
};

export type DbNotification = {
  id: string;
  user_id: string;
  categorie: string;
  type_notif: string;
  titre: string;
  message?: string;
  lien?: string;
  icone?: string;
  couleur?: string;
  est_lu?: boolean;
  date_lecture?: string;
  created_at: string;
};

export type DbFacture = {
  id: string;
  order_id: string;
  numero_facture: string;
  qr_code?: string;
  created_at: string;
};

export type DbReversement = {
  id: string;
  order_id: string;
  artisan_id: string;
  montant_brut: number;
  commission: number;
  montant_net: number;
  statut?: string;
  date_versement?: string;
  created_at: string;
  order_number?: string;
  total?: number;
};

export type DbDemandePaiement = {
  id: string;
  artisan_id: string;
  montant: number;
  hub_id?: string;
  mode_paiement_artisan?: string;
  reference_mm?: string;
  titulaire_mm?: string;
  statut?: string;
  date_demande: string;
  date_paiement?: string;
  reference_paiement?: string;
};

export type DbCartSession = {
  id: string;
  user_id: string;
  statut: string;
  created_at: string;
};

export type DbProductVariation = {
  id: string;
  product_id: string;
  couleur?: string;
  couleur_nom?: string;
  taille?: string;
  type_mesure?: string;
  poids?: number;
  prix: number;
  stock?: number;
  seuil_alerte?: number;
  remise?: number;
  created_at: string;
};

export type DbProductImage = {
  id: string;
  product_id: string;
  image: string;
  sort_order?: number;
  created_at: string;
};

export type DbCategory = {
  id: string;
  nom: string;
  description?: string;
  image?: string;
  created_at: string;
};

// ---- API Response types ----

export type StatsResponse = {
  users: number;
  products: number;
  orders: number;
  revenue: number;
  artisans: number;
  hubs: number;
  ordersByStatus: { status: string; count: number }[];
};

export type UserWithRoles = {
  id: string;
  email: string;
  full_name?: string;
  phone?: string;
  country?: string;
  is_active?: boolean;
  created_at: string;
  roles: string[];
};

export type ArtisanStats = {
  productsCount: number;
  ordersCount: number;
  totalRevenue: number;
  pendingPayouts: number;
  availableBalance: number;
  recentOrders: DbOrder[];
};

export type LivreurDashboardStats = {
  assignedToday: number;
  inDelivery: number;
  toCollect: number;
  completedToday: number;
  collectedThisMonth: number;
  successRate: number;
};

export type HubWithStats = DbHub & {
  zones_count: number;
  livraisons_aujourdhui: number;
};

export type GlobalSearchResult = {
  products: { id: string; name: string; type: string; image?: string; info?: string }[];
  artisans: { id: string; name: string; type: string; image?: string; info?: string }[];
  articles: { id: string; name: string; type: string; image?: string; info?: string }[];
};

export type CronResult = {
  cancelled?: number;
  reminders?: number;
  reactivated?: number;
  alerts?: { variationId: string; productId: string; stock: number }[];
};

export type ReviewWithProduct = DbReview & {
  user_name?: string;
  product_name?: string;
  product_image?: string;
};

export type NotificationWithUser = DbNotification & {
  user_email?: string;
  user_name?: string;
};

export type SalesAnalytics = {
  daily: { date: string; orders: number; revenue: number }[];
  weekly: { week: string; orders: number; revenue: number }[];
  monthly: { month: string; orders: number; revenue: number }[];
};

export type TopProduct = {
  id: string;
  name: string;
  total_sold: number;
  total_revenue: number;
};

export type RevenuePoint = {
  month: string;
  revenue: number;
  orders: number;
};

export type LowStockItem = {
  id: string;
  product_id: string;
  product_name: string;
  couleur?: string;
  taille?: string;
  stock: number;
  seuil_alerte: number;
};

export type ActivityEntry = {
  id: string;
  type: string;
  description: string;
  user_name?: string;
  user_email?: string;
  created_at: string;
};

export type DbPromotion = {
  id: string;
  user_id: string;
  code: string;
  discount: number;
  type: string;
  uses: number;
  max_uses: number | null;
  active: boolean;
  created_at: string;
};

export type B2BProfile = {
  id: string;
  user_id: string;
  company_name: string;
  siret: string;
  moq: number;
  volume_discount: number;
  production_delay_days: number;
  incoterm_preferred: string;
  created_at: string;
  updated_at: string;
};

export type UserProfileUpdate = {
  full_name?: string;
  phone?: string;
  country?: string;
  city?: string;
  description?: string;
};

// ---- AppError ----

export class AppError extends Error {
  constructor(
    message: string,
    public code?: string,
    public statusCode: number = 500,
    public cause?: unknown
  ) {
    super(message);
    this.name = "AppError";
  }

  static badRequest(msg: string) {
    return new AppError(msg, "BAD_REQUEST", 400);
  }

  static notFound(msg: string) {
    return new AppError(msg, "NOT_FOUND", 404);
  }

  static unauthorized(msg: string = "Non autorisé") {
    return new AppError(msg, "UNAUTHORIZED", 401);
  }

  static conflict(msg: string) {
    return new AppError(msg, "CONFLICT", 409);
  }

  static from(err: unknown, fallback: string = "Erreur interne"): AppError {
    if (err instanceof AppError) return err;
    if (err instanceof Error) return new AppError(err.message, "INTERNAL", 500, err);
    return new AppError(fallback, "INTERNAL", 500, err);
  }
}

// ---- Flask backend API types ----
export type LoginResponse = {
  token: string;
  refresh_token: string;
  user: FlaskUser;
};

export type RegisterResponse = {
  token: string;
  refresh_token: string;
  user: FlaskUser;
};

export type FlaskUser = {
  id: string;
  email: string;
  nom: string;
  prenom: string;
  role: string;
  telephone?: string;
  region?: string;
  photo_de_profil?: string;
  description?: string;
  statut?: string;
  is_staff?: boolean;
  date_inscription?: string;
};

export type FlaskProduct = {
  id: string;
  nom: string;
  description: string;
  prix: string;
  poids?: string;
  image: string;
  statut: string;
  id_categorie: string;
  id_utilisateur: string;
  date_ajout?: string;
  variations?: FlaskVariation[];
};

export type FlaskVariation = {
  id: string;
  couleur?: string;
  couleur_nom?: string;
  taille?: string;
  type_mesure?: string;
  prix: string;
  stock: number;
  remise?: string;
};

export type FlaskCategory = {
  id: string;
  nom: string;
  description: string;
  image?: string;
};

export type FlaskOrder = {
  id: string;
  id_utilisateur: string;
  status: string;
  payment_method: string;
  montant_total: string;
  frais_livraison: string;
  notes: string;
  date_creation: string;
  date_confirmation?: string;
  items: FlaskOrderItem[];
};

export type FlaskOrderItem = {
  id: string;
  produit_id: string;
  quantite: number;
  prix_unitaire: string;
  total: string;
};

export type FlaskHub = {
  id: string;
  nom: string;
  region: string;
  ville: string;
  telephone: string;
  contact: string;
  prix_par_km: string;
  prix_par_kg: string;
  regions_servees: string[];
  mvola_number?: string;
  airtel_money_number?: string;
  orange_money_number?: string;
};

export type FlaskZoneLivraison = {
  id: string;
  hub_id: string;
  nom: string;
  ville: string;
  distance_km?: string;
  delai_estime_jours: number;
};

export type FlaskNotification = {
  id: string;
  categorie: string;
  type_notif: string;
  titre: string;
  message: string;
  lien?: string;
  icone?: string;
  couleur?: string;
  est_lu: boolean;
  date_creation: string;
};

export type FlaskTransaction = {
  id: string;
  gateway: string;
  gateway_transaction_id: string;
  montant: string;
  devise: string;
  statut: string;
  error_message?: string;
  date_creation: string;
};
