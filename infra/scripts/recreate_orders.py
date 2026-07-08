"""Delete all existing orders and recreate them with varied dates/hours between the two clients."""
import django, os, sys
from datetime import timedelta
from decimal import Decimal
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'e_artisan_projet.settings')
os.environ['DJANGO_ALLOW_ASYNC_UNSAFE'] = 'true'
django.setup()

from django.utils import timezone
from utilisateurs.models import Utilisateur
from commandes.models import CartSession, Panier, Validation, Facture, ReversementArtisan, DemandePaiement
from livraisons.models import Livraison, Hub, ZoneLivraison

now = timezone.now()

# ──────────────────────────────────────────────
# 1. DELETE ALL EXISTING ORDER DATA
# ──────────────────────────────────────────────
print("=== Suppression des anciennes donnees ===")

# DemandePaiement are independent from Validation
dp_count = DemandePaiement.objects.count()
DemandePaiement.objects.all().delete()
print(f"  DemandePaiement: {dp_count} supprimees")

# Deleting Validation cascades to Facture, Livraison, ReversementArtisan, Colis
val_count = Validation.objects.count()
f_count = Facture.objects.count()
l_count = Livraison.objects.count()
r_count = ReversementArtisan.objects.count()
Validation.objects.all().delete()
print(f"  Validation: {val_count} -> Facture {f_count}, Livraison {l_count}, Reversement {r_count}")

# Delete Panier and CartSession that are not active carts
# Keep active cart_sessions (users might be shopping)
converted = CartSession.objects.filter(statut__in=['converted', 'abandoned', 'expired'])
cs_ids = list(converted.values_list('id', flat=True))
p_count = Panier.objects.filter(cart_session_id__in=cs_ids).count()
Panier.objects.filter(cart_session_id__in=cs_ids).delete()
converted.delete()
print(f"  Panier: {p_count} supprimes (CartSession: {len(cs_ids)} converted/abandoned)")

print("=== Suppression terminee ===\n")

# ──────────────────────────────────────────────
# 2. RE-CREATE ORDERS
# ──────────────────────────────────────────────

# Clients
solo = Utilisateur.objects.get(id=21)   # Solo Nirina
paul = Utilisateur.objects.get(id=40)   # Paul Rakoto

# Livreur
livreur = Utilisateur.objects.get(id=30)

# Hub
hub_tana = Hub.objects.get(id=22)

# Zones (livraison directe)
zone_anosizato = ZoneLivraison.objects.get(id=144)  # Anosizato - Solo's usual
zone_anosibe   = ZoneLivraison.objects.get(id=143)  # Anosibe - Paul's usual

# ─── Products & variations ───
# These are used to create Panier items
# (id_produit, produit_variation, prix_unitaire, quantite)
products = {
    # Livah (artisan 7)
    "chemise_18":     (21, 18,  Decimal("30000")),   # Chemise taille M
    "chemise_21":     (21, 21,  Decimal("32000")),   # Chemise taille L
    "sandales_175":   (23, 175, Decimal("35700")),   # Sandales 37
    "sandales_182":   (23, 182, Decimal("42000")),   # Sandales 40
    "sandales_188":   (23, 188, Decimal("42000")),   # Sandales 42
    "mocassin_220":   (27, 220, Decimal("50000")),   # Mocassin 40
    "mocassin_226":   (27, 226, Decimal("50000")),   # Mocassin 41
    "mocassin_234":   (27, 234, Decimal("52000")),   # Mocassin 42
    "mocassin_238":   (27, 238, Decimal("52000")),   # Mocassin 43
    # Anicet (artisan 31)
    "bandouliere_31": (22, 31,  Decimal("30000")),   # Bandouliere standard
    "bandouliere_34": (22, 34,  Decimal("35000")),   # Bandouliere large
    # Sitraka (artisan 39)
    "plat_247":       (31, 247, Decimal("15000")),   # Plat de service petit
    "plat_250":       (31, 250, Decimal("15000")),   # Plat de service grand
    "plat_252":       (31, 252, Decimal("15000")),   # Plat de service XL
    "bol_280":        (64, 280, Decimal("10000")),   # Bol Fleur de Terre petit
    "bol_283":        (64, 283, Decimal("10000")),   # Bol Fleur de Terre moyen
    "bol_284":        (64, 284, Decimal("10000")),   # Bol Fleur de Terre grand
}

def make_cart_session(client):
    cs = CartSession.objects.create(id_utilisateur=client, statut='converted')
    return cs

def make_panier(cs, client, prod_key, qty=1):
    prod_id, var_id, prix = products[prod_key]
    return Panier.objects.create(
        cart_session=cs, id_utilisateur=client,
        id_produit_id=prod_id, produit_variation_id=var_id,
        quantite=qty, prix_unitaire=prix, fulfillment_status='available',
    )

def make_validation(panier, client, dt, frais, total, statut, adresse,
                    hub_dest=None, zone=None, payment_method='cash_on_delivery'):
    v = Validation.objects.create(
        id_panier=panier, frais_livraison=frais, montant_total=total,
        statut=statut, adresse_livraison=adresse,
        hub_destination=hub_dest, zone_livraison=zone,
        payment_method=payment_method,
    )
    Validation.objects.filter(id=v.id).update(date_creation=dt)
    v.date_creation = dt
    return v

def make_facture(validation, dt):
    f = Facture.objects.create(
        id_validation=validation,
        numero_facture=f"FAC-{dt.strftime('%Y%m%d')}-{validation.id}",
        statut='awaiting_payment',
        qr_code='{"data":"","url":"","format":"png_base64"}',
    )
    Facture.objects.filter(id=f.id).update(date_emission=dt)
    return f

def make_livraison(validation, dt_prevue, client, hub_dest, montant_du, dt,
                   zone=None, cooperative='', numero_suivi='', shipped_at=None):
    l = Livraison.objects.create(
        id_validation=validation, id_utilisateur=livreur,
        hub_destination=hub_dest, zone_livraison=zone,
        cooperative_nom=cooperative, cooperative_numero_suivi=numero_suivi,
        montant_du=montant_du, shipped_at=shipped_at,
        date_prevue=dt_prevue,
    )
    Livraison.objects.filter(id=l.id).update(date_creation=dt)
    return l

def make_reversements(validation, dt):
    session = validation.id_panier.cart_session
    items = [ln for ln in session.items.all() if ln.fulfillment_status == 'available']
    from itertools import groupby
    key_fn = lambda ln: ln.id_produit.id_utilisateur_id
    items.sort(key=key_fn)
    for artisan_id, lignes in groupby(items, key=key_fn):
        lignes = list(lignes)
        montant_brut = sum(Decimal(ln.prix_unitaire) * (ln.fulfillment_quantity or ln.quantite) for ln in lignes)
        commission = (montant_brut * Decimal("5")) / Decimal("100")
        montant_net = montant_brut - commission
        r = ReversementArtisan.objects.create(
            validation=validation, artisan_id=artisan_id,
            montant_brut=montant_brut, commission=commission, montant_net=montant_net,
        )
        ReversementArtisan.objects.filter(id=r.id).update(date_creation=dt)

# ──────────────────────────────────────────────
# ORDER DEFINITIONS
# ──────────────────────────────────────────────
base = now.replace(hour=0, minute=0, second=0, microsecond=0) - timedelta(days=10)

orders = [
    # ── Day 1 ──
    {
        'client': solo, 'day_offset': 1, 'hour': 9, 'minute': 15,
        'items': [('sandales_175', 1), ('plat_247', 1)],
        'frais': 4700, 'statut': 'delivered',
        'adresse': 'Analamanga, Antananarivo, Lot IIIDBis Anosizato-Est',
        'zone': zone_anosizato, 'livraison_prevue_days': 1,
    },
    {
        'client': paul, 'day_offset': 1, 'hour': 11, 'minute': 30,
        'items': [('bandouliere_31', 1), ('bol_280', 2)],
        'frais': 3400, 'statut': 'delivered',
        'adresse': 'Analamanga, Antananarivo, Lot 123 Anosibe',
        'zone': zone_anosibe, 'livraison_prevue_days': 1,
    },
    # ── Day 2 ──
    {
        'client': solo, 'day_offset': 2, 'hour': 8, 'minute': 0,
        'items': [('mocassin_220', 1), ('bandouliere_31', 1)],
        'frais': 3250, 'statut': 'forwarded',
        'adresse': 'Itasy, Arivonimamo, Lot III D CBis, Mangarivotra',
        'zone': None, 'livraison_prevue_days': 3,
        'cooperative': 'Cotisse', 'numero_suivi': 'CT45678',
        'shipped_at_offset_hours': 2,
    },
    {
        'client': paul, 'day_offset': 2, 'hour': 14, 'minute': 45,
        'items': [('plat_250', 2), ('chemise_18', 1)],
        'frais': 3000, 'statut': 'forwarded',
        'adresse': 'Analamanga, Antananarivo, Lot 456 Anosibe',
        'zone': None, 'livraison_prevue_days': 4,
        'cooperative': 'Soatrans', 'numero_suivi': 'SO98765',
        'shipped_at_offset_hours': 3,
    },
    # ── Day 3 ──
    {
        'client': solo, 'day_offset': 3, 'hour': 16, 'minute': 30,
        'items': [('chemise_21', 1), ('sandales_182', 1)],
        'frais': 4600, 'statut': 'preparing',
        'adresse': 'Analamanga, Antananarivo, Lot IIIDBis Anosizato-Est',
        'zone': zone_anosizato, 'livraison_prevue_days': 1,
    },
    {
        'client': paul, 'day_offset': 3, 'hour': 10, 'minute': 0,
        'items': [('mocassin_226', 1)],
        'frais': 3500, 'statut': 'prete',
        'adresse': 'Analamanga, Antananarivo, Lot 789 Anosibe',
        'zone': zone_anosibe, 'livraison_prevue_days': 0,
    },
    # ── Day 4 ──
    {
        'client': solo, 'day_offset': 4, 'hour': 7, 'minute': 45,
        'items': [('sandales_188', 1), ('bol_284', 2)],
        'frais': 7000, 'statut': 'forwarded',
        'adresse': 'Itasy, Arivonimamo, Lot III D CBis, Mangarivotra',
        'zone': None, 'livraison_prevue_days': 5,
        'cooperative': 'FIFIA', 'numero_suivi': 'FF25653',
        'shipped_at_offset_hours': 1,
    },
    {
        'client': paul, 'day_offset': 4, 'hour': 13, 'minute': 15,
        'items': [('sandales_182', 1), ('plat_252', 1)],
        'frais': 3100, 'statut': 'forwarded',
        'adresse': 'Atsinanana, Toamasina, Lot 12B Ankirihiry',
        'zone': None, 'livraison_prevue_days': 6,
        'cooperative': 'Cotisse', 'numero_suivi': 'CT54321',
        'shipped_at_offset_hours': 2,
    },
    # ── Day 5 ──
    {
        'client': solo, 'day_offset': 5, 'hour': 10, 'minute': 30,
        'items': [('mocassin_234', 1), ('bandouliere_34', 1)],
        'frais': 4550, 'statut': 'confirmed',
        'adresse': 'Analamanga, Antananarivo, Lot IIIDBis Anosizato-Est',
        'zone': zone_anosizato, 'livraison_prevue_days': 0,
    },
    {
        'client': paul, 'day_offset': 5, 'hour': 15, 'minute': 0,
        'items': [('bol_283', 3), ('chemise_21', 1)],
        'frais': 3200, 'statut': 'pending',
        'adresse': 'Analamanga, Antananarivo, Lot 123 Anosibe',
        'zone': zone_anosibe, 'livraison_prevue_days': 0,
        'mode_paiement': 'mobile_money',
    },
]

created_validations = []

for o in orders:
    dt = base + timedelta(days=o['day_offset'], hours=o['hour'], minutes=o['minute'])
    client = o['client']

    # CartSession
    cs = make_cart_session(client)
    CartSession.objects.filter(id=cs.id).update(date_creation=dt)

    # Panier items
    first_panier = None
    total_items = Decimal("0")
    for prod_key, qty in o['items']:
        p = make_panier(cs, client, prod_key, qty)
        if first_panier is None:
            first_panier = p
        total_items += p.prix_unitaire * qty

    # Validation
    montant_total = total_items + o['frais']
    v = make_validation(
        first_panier, client, dt, o['frais'], montant_total,
        o['statut'], o['adresse'], hub_dest=hub_tana,
        zone=o.get('zone'), payment_method=o.get('mode_paiement', 'cash_on_delivery'),
    )

    # Facture
    f = make_facture(v, dt + timedelta(minutes=2))
    f.numero_facture = f"FAC-{dt.strftime('%Y%m%d')}-{v.id}"
    f.save(update_fields=['numero_facture'])

    # Livraison
    dt_prevue = dt + timedelta(days=o.get('livraison_prevue_days', 1), hours=12)
    cooperative = o.get('cooperative', '')
    shipped_at = None
    if cooperative:
        shipped_at = dt + timedelta(hours=o.get('shipped_at_offset_hours', 2))
    make_livraison(
        v, dt_prevue, client, hub_tana, montant_total, dt, zone=o.get('zone'),
        cooperative=cooperative, numero_suivi=o.get('numero_suivi', ''),
        shipped_at=shipped_at,
    )

    # Reversements for delivered/preparing/prete/forwarded/confirmed
    if o['statut'] in ('delivered', 'forwarded', 'preparing', 'prete', 'confirmed'):
        make_reversements(v, dt)

    created_validations.append(v)
    print(f"  CMD{v.id:>4} | {dt.strftime('%d/%m %H:%M')} | {client.prenom:10} {client.nom:12} | {o['statut']:10} | {montant_total:>8} Ar | {'Expedition' if not o.get('zone') else 'Directe'}")

print(f"\n=== Termine: {len(created_validations)} commandes creees ===")
