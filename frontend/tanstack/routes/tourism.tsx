import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { SiteHeader } from "../components/site-header";
import { SiteFooter } from "../components/site-footer";
import { MapPin, Calendar, Users, GraduationCap, ShoppingBag, ArrowRight, X, Loader2 } from "lucide-react";
import heroImg from "../assets/hero-weaving.jpg";
import { WORKSHOPS, type Workshop } from "../lib/data";
import { getWorkshops, createBooking } from "../lib/api/db.server";
import { useState } from "react";
import { useAuth } from "../hooks/use-auth";
import { toast } from "sonner";

export const Route = createFileRoute("/tourism")({
  head: () => ({ meta: [{ title: "Tourisme Artisanal — TISSAGE" }, { name: "description", content: "Réservez une visite d'atelier, participez à une formation artisanale à Madagascar et dans le monde." }] }),
  loader: async () => {
    try {
      const workshops = await getWorkshops();
      if (workshops && workshops.length > 0) return { workshops };
    } catch (e) { console.error("Failed to load workshops:", e); }
    return { workshops: WORKSHOPS };
  },
  pendingMinMs: 300,
  pendingComponent: () => <div className="flex min-h-[60vh] items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>,
  component: Tourism,
});

function Tourism() {
  const { workshops } = Route.useLoaderData();
  const [selected, setSelected] = useState<Workshop | null>(null);

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <section className="relative overflow-hidden bg-noir text-creme">
        <img src={heroImg} alt="" className="absolute inset-0 h-full w-full object-cover opacity-50" />
        <div className="absolute inset-0 bg-gradient-to-r from-noir via-noir/70 to-transparent" />
        <div className="relative mx-auto max-w-7xl px-6 py-24">
          <span className="inline-flex rounded-full border border-or/40 bg-or/10 px-3 py-1 text-xs font-semibold text-or">TOURISME ARTISANAL</span>
          <h1 className="mt-5 max-w-3xl font-display text-4xl font-bold leading-tight md:text-6xl">Vivez l'artisanat <span className="text-gradient-or">de l'intérieur</span></h1>
          <p className="mt-4 max-w-2xl text-creme/80">Réservez une visite, participez à une formation, repartez avec votre création.</p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-16 grid gap-6 md:grid-cols-4">
        {[
          { i: MapPin, t: "Découvrir les ateliers", d: "Une carte des artisans qui ouvrent leurs portes." },
          { i: Calendar, t: "Réserver une visite", d: "Choisissez la date, payez en ligne en sécurité." },
          { i: GraduationCap, t: "Formations", d: "Apprenez auprès des maîtres." },
          { i: ShoppingBag, t: "Acheter sur place", d: "Repartez avec une pièce unique." },
        ].map(({ i: Icon, t, d }) => (
          <div key={t} className="rounded-2xl border border-border bg-card p-6 shadow-card">
            <div className="grid h-12 w-12 place-items-center rounded-xl bg-or/10 text-terre"><Icon className="h-6 w-6" /></div>
            <h3 className="mt-5 text-lg font-semibold">{t}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{d}</p>
          </div>
        ))}
      </section>

      <section className="bg-card/50">
        <div className="mx-auto max-w-7xl px-6 py-16">
          <h2 className="font-display text-3xl font-bold">Expériences à venir</h2>
          <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {workshops.map((w: any) => (
              <div key={w.id} className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
                <div className="aspect-[4/3] overflow-hidden bg-muted">
                  <img src={w.img} alt={w.title} loading="lazy" width={400} height={300} className="h-full w-full object-cover" />
                </div>
                <div className="p-5">
                  <h3 className="font-semibold leading-tight">{w.title}</h3>
                  <p className="mt-2 inline-flex items-center gap-1 text-xs text-muted-foreground"><MapPin className="h-3 w-3" /> {w.location}</p>
                  <div className="mt-3 flex items-center justify-between text-sm">
                    <span className="inline-flex items-center gap-1 text-muted-foreground"><Users className="h-3.5 w-3.5" /> {w.duration}</span>
                    <span className="font-display text-lg font-bold text-terre">{w.price.toFixed(0)} €</span>
                  </div>
                  <button onClick={() => setSelected(w)} className="mt-4 w-full inline-flex items-center justify-center gap-1 rounded-md bg-primary py-2 text-sm font-medium text-primary-foreground hover:opacity-90">
                    Réserver <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
      <SiteFooter />
      {selected && <BookingDialog workshop={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

function BookingDialog({ workshop, onClose }: { workshop: Workshop; onClose: () => void }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [date, setDate] = useState("");
  const [participants, setParticipants] = useState(1);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const total = workshop.price * participants;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) {
      onClose();
      navigate({ to: "/auth", search: { redirect: "/tourism" } });
      return;
    }
    setSubmitting(true);
    try {
      await createBooking({
        data: {
          userId: user.id,
          workshopId: workshop.id,
          workshopTitle: workshop.title,
          workshopLocation: workshop.location,
          workshopImage: workshop.img,
          bookingDate: date,
          participants,
          unitPrice: workshop.price,
          total,
          notes: notes || null,
        },
      });
      toast.success("Réservation enregistrée ! L'artisan vous contactera.");
      onClose();
    } catch (err: any) {
      toast.error(err?.message || "Erreur lors de la réservation");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-noir/60 p-4">
      <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-background shadow-soft">
        <div className="relative bg-card p-6">
          <button onClick={onClose} className="absolute right-4 top-4 text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
          <h3 className="font-display text-xl font-bold">{workshop.title}</h3>
          <p className="text-xs text-muted-foreground"><MapPin className="mr-1 inline h-3 w-3" />{workshop.location} · {workshop.duration}</p>
        </div>
        <form onSubmit={submit} className="space-y-4 p-6">
          <label className="block">
            <span className="text-xs font-medium text-muted-foreground">Date souhaitée *</span>
            <input type="date" required value={date} onChange={(e) => setDate(e.target.value)} min={new Date().toISOString().split("T")[0]} className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
          </label>
          <label className="block">
            <span className="text-xs font-medium text-muted-foreground">Nombre de participants *</span>
            <input type="number" min={1} max={workshop.maxParticipants} value={participants} onChange={(e) => setParticipants(Math.max(1, Math.min(workshop.maxParticipants, Number(e.target.value))))} className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
            <span className="mt-1 block text-xs text-muted-foreground">Max {workshop.maxParticipants} personnes</span>
          </label>
          <label className="block">
            <span className="text-xs font-medium text-muted-foreground">Demandes spéciales</span>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} maxLength={500} className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
          </label>
          <div className="flex items-center justify-between rounded-lg bg-card p-3">
            <span className="text-sm text-muted-foreground">Total</span>
            <span className="font-display text-2xl font-bold text-terre">{total.toFixed(2)} €</span>
          </div>
          <button type="submit" disabled={submitting} className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-primary py-2.5 font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60">
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : (user ? "Confirmer la réservation" : "Se connecter pour réserver")}
          </button>
        </form>
      </div>
    </div>
  );
}
