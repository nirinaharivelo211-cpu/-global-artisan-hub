import type { Product } from "@/lib/data";
import { Heart, Star, Truck, ShieldCheck } from "lucide-react";
import { Link } from "@tanstack/react-router";

export function ProductCard({ p }: { p: Product }) {
  return (
    <Link to="/product/$id" params={{ id: p.id }} className="group block overflow-hidden rounded-xl bg-card shadow-card transition hover:-translate-y-1 hover:shadow-soft">
      <div className="relative aspect-square overflow-hidden bg-muted">
        <img src={p.img} alt={p.name} loading="lazy" width={400} height={400} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
        <button onClick={(e) => e.preventDefault()} className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-background/90 text-foreground/70 shadow-sm hover:text-rouge">
          <Heart className="h-4 w-4" />
        </button>
        <div className="absolute left-3 top-3 flex flex-col gap-1">
          {p.isNew && <span className="rounded bg-or px-2 py-0.5 text-[10px] font-semibold text-noir">NOUVEAU</span>}
          {p.certified && <span className="rounded bg-vert/90 px-2 py-0.5 text-[10px] font-semibold text-white">CERTIFIÉ</span>}
        </div>
      </div>
      <div className="p-4">
        <h3 className="line-clamp-1 font-semibold leading-tight">{p.name}</h3>
        <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{p.artisan} · {p.country}</p>
        <div className="mt-2 flex items-end justify-between">
          <div className="font-display text-lg font-bold text-terre">{p.price.toFixed(2)} €</div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Star className="h-3 w-3 fill-or text-or" /> {p.rating} <span>({p.reviews})</span>
          </div>
        </div>
        <div className="mt-2 flex gap-1.5 text-[10px] text-muted-foreground">
          {p.fastShip && <span className="inline-flex items-center gap-1 rounded bg-muted px-1.5 py-0.5"><Truck className="h-3 w-3" />Rapide</span>}
          {p.fairTrade && <span className="inline-flex items-center gap-1 rounded bg-muted px-1.5 py-0.5"><ShieldCheck className="h-3 w-3" />Équitable</span>}
        </div>
      </div>
    </Link>
  );
}
