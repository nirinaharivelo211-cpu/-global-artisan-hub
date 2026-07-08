def get_currency_from_country(country: str) -> str:
    currencies = {
        "Madagascar": "MGA",
        "France": "EUR",
        "États-Unis": "USD",
        "Royaume-Uni": "GBP",
    }
    return currencies.get(country, "EUR")


def determine_payment_method_by_city(city: str) -> str:
    from app.models.commande import PaymentMethod
    cities_mm = ["Antananarivo", "Toamasina", "Fianarantsoa", "Mahajanga", "Antsiranana"]
    if city in cities_mm:
        return PaymentMethod.MOBILE_MONEY
    return PaymentMethod.STRIPE


def normalize_city(city: str) -> str:
    mapping = {
        "tana": "Antananarivo",
        "tananarive": "Antananarivo",
        "tamatave": "Toamasina",
        "fianar": "Fianarantsoa",
        "majunga": "Mahajanga",
        "diégo": "Antsiranana",
        "diégo-suarez": "Antsiranana",
    }
    return mapping.get(city.lower().strip(), city)


def get_payment_method_display(method: str) -> str:
    displays = {
        "mobile_money": "Mobile Money",
        "cash_on_delivery": "Cash on Delivery",
        "stripe": "Carte bancaire",
        "flutterwave": "Flutterwave",
        "card": "Carte bancaire",
    }
    return displays.get(method, method)


def allowed_file(filename: str) -> bool:
    ALLOWED_EXTENSIONS = {"png", "jpg", "jpeg", "gif", "webp", "pdf", "svg"}
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS
