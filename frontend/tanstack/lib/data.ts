import pBasket from "@/assets/p-basket.jpg";
import pStatue from "@/assets/p-statue.jpg";
import pTextile from "@/assets/p-textile.jpg";
import pJewelry from "@/assets/p-jewelry.jpg";
import pVase from "@/assets/p-vase.jpg";
import pBag from "@/assets/p-bag.jpg";

export const PRODUCT_IMAGES = { pBasket, pStatue, pTextile, pJewelry, pVase, pBag };

export const CATEGORIES = [
  "Sculpture","Vannerie","Broderie","Textile","Soie","Bois précieux","Corne de zébu",
  "Pierre","Bijoux","Décoration","Accessoires","Produits écologiques","Art contemporain","Gastronomie artisanale",
];

export const COUNTRIES = ["Madagascar","Maroc","Sénégal","Kenya","Côte d'Ivoire","Mali","Éthiopie","Rwanda"];
export const MATERIALS = ["Raphia","Bois","Soie","Cuir","Corne de zébu","Pierre","Cuivre","Coton"];

export type Product = {
  id: string; name: string; artisan: string; country: string; category: string; material: string;
  price: number; rating: number; reviews: number; img: string; fastShip?: boolean; fairTrade?: boolean; certified?: boolean; isNew?: boolean;
};

export const PRODUCTS: Product[] = [
  { id: "p1", name: "Sac en raphia naturel", artisan: "Ravelonarivo Andry", country: "Madagascar", category: "Vannerie", material: "Raphia", price: 45, rating: 4.8, reviews: 124, img: pBasket, fastShip: true, fairTrade: true, certified: true },
  { id: "p2", name: "Statue en bois sculpté", artisan: "Diallo Mamadou", country: "Sénégal", category: "Sculpture", material: "Bois", price: 120, rating: 4.7, reviews: 58, img: pStatue, fairTrade: true, certified: true },
  { id: "p3", name: "Étole en soie sauvage", artisan: "Hery Rakoto", country: "Madagascar", category: "Soie", material: "Soie", price: 85, rating: 4.9, reviews: 92, img: pTextile, isNew: true, fairTrade: true },
  { id: "p4", name: "Boucles d'oreilles laiton", artisan: "Asha Kimani", country: "Kenya", category: "Bijoux", material: "Corne de zébu", price: 35, rating: 4.6, reviews: 211, img: pJewelry, fastShip: true },
  { id: "p5", name: "Vase céramique peint", artisan: "Karim El Idrissi", country: "Maroc", category: "Décoration", material: "Pierre", price: 60, rating: 4.8, reviews: 71, img: pVase, certified: true },
  { id: "p6", name: "Panier tressé XL", artisan: "Ravelonarivo Andry", country: "Madagascar", category: "Vannerie", material: "Raphia", price: 32, rating: 4.9, reviews: 184, img: pBag, fastShip: true, isNew: true, fairTrade: true },
  { id: "p7", name: "Corbeille décorative", artisan: "Ravelonarivo Andry", country: "Madagascar", category: "Vannerie", material: "Raphia", price: 35, rating: 4.7, reviews: 27, img: pBasket, fairTrade: true },
  { id: "p8", name: "Masque traditionnel", artisan: "Diallo Mamadou", country: "Mali", category: "Sculpture", material: "Bois", price: 95, rating: 4.6, reviews: 33, img: pStatue, certified: true },
  { id: "p9", name: "Étoffe brodée main", artisan: "Hery Rakoto", country: "Madagascar", category: "Broderie", material: "Coton", price: 65, rating: 4.7, reviews: 19, img: pTextile, isNew: true },
  { id: "p10", name: "Pendentif corne & or", artisan: "Asha Kimani", country: "Kenya", category: "Bijoux", material: "Corne de zébu", price: 48, rating: 4.8, reviews: 64, img: pJewelry, fairTrade: true },
  { id: "p11", name: "Jarre artisanale", artisan: "Karim El Idrissi", country: "Maroc", category: "Décoration", material: "Pierre", price: 110, rating: 4.9, reviews: 12, img: pVase, certified: true, fairTrade: true },
  { id: "p12", name: "Sac cabas raphia & cuir", artisan: "Ravelonarivo Andry", country: "Madagascar", category: "Accessoires", material: "Cuir", price: 78, rating: 4.8, reviews: 47, img: pBag, fastShip: true },
];

export type Artisan = {
  id: string; name: string; specialty: string; country: string; city: string; rating: number; reviews: number; products: number; experience: number; certified: boolean;
};

export const ARTISANS: Artisan[] = [
  { id: "a1", name: "Ravelonarivo Andry", specialty: "Vannier traditionnel", country: "Madagascar", city: "Antananarivo", rating: 4.8, reviews: 128, products: 48, experience: 12, certified: true },
  { id: "a2", name: "Diallo Mamadou", specialty: "Sculpteur sur bois", country: "Sénégal", city: "Dakar", rating: 4.7, reviews: 86, products: 32, experience: 18, certified: true },
  { id: "a3", name: "Hery Rakoto", specialty: "Tisserande de soie", country: "Madagascar", city: "Fianarantsoa", rating: 4.9, reviews: 211, products: 56, experience: 15, certified: true },
  { id: "a4", name: "Asha Kimani", specialty: "Bijoutière laiton", country: "Kenya", city: "Nairobi", rating: 4.6, reviews: 64, products: 41, experience: 9, certified: false },
  { id: "a5", name: "Karim El Idrissi", specialty: "Céramiste", country: "Maroc", city: "Fès", rating: 4.8, reviews: 92, products: 28, experience: 22, certified: true },
  { id: "a6", name: "Aminata Traoré", specialty: "Brodeuse traditionnelle", country: "Mali", city: "Bamako", rating: 4.7, reviews: 41, products: 19, experience: 11, certified: true },
];

export type Workshop = {
  id: string; title: string; location: string; duration: string; price: number; img: string; description: string; maxParticipants: number;
};

export const WORKSHOPS: Workshop[] = [
  { id: "w1", title: "Atelier de vannerie traditionnelle", location: "Antananarivo, Madagascar", duration: "Demi-journée", price: 45, img: pBasket, description: "Apprenez les gestes ancestraux du tissage de raphia avec un maître vannier. Repartez avec votre création.", maxParticipants: 8 },
  { id: "w2", title: "Formation sculpture sur bois", location: "Dakar, Sénégal", duration: "2 jours", price: 180, img: pStatue, description: "Initiation aux outils traditionnels et techniques de sculpture sur bois précieux d'Afrique de l'Ouest.", maxParticipants: 6 },
  { id: "w3", title: "Découverte du tissage de soie", location: "Fianarantsoa, Madagascar", duration: "1 journée", price: 75, img: pTextile, description: "De la chenille sauvage au métier à tisser, plongez dans la soie malgache aux côtés des artisanes.", maxParticipants: 10 },
  { id: "w4", title: "Initiation à la céramique", location: "Fès, Maroc", duration: "Demi-journée", price: 55, img: pVase, description: "Modelage, tournage et premiers émaux dans l'antre d'un céramiste de la médina.", maxParticipants: 8 },
];

