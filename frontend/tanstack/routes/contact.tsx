import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { useState } from "react";
import { Mail, MapPin, Phone, Clock, Send, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/contact")({
  head: () => ({ meta: [{ title: "Contact — TISSAGE" }, { name: "description", content: "Contactez l'équipe TISSAGE. Support 24/7, partenariats, presse." }] }),
  component: Contact,
});

function Contact() {
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });
  const [sending, setSending] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    await new Promise((r) => setTimeout(r, 1000));
    toast.success("Message envoyé ! Nous vous répondrons sous 24h.");
    setForm({ name: "", email: "", subject: "", message: "" });
    setSending(false);
  }

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <section className="mx-auto max-w-5xl px-6 py-16 text-center">
        <h1 className="text-4xl font-bold md:text-5xl">Contactez-nous</h1>
        <p className="mt-4 text-muted-foreground">Une question, un partenariat, une suggestion ? Nous sommes à votre écoute.</p>
      </section>

      <section className="mx-auto grid max-w-6xl gap-8 px-6 pb-16 lg:grid-cols-[1fr_400px]">
        <form onSubmit={handleSubmit} className="rounded-2xl border border-border bg-card p-6 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="text-xs font-medium text-muted-foreground">Nom complet *</span>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary" />
            </label>
            <label className="block text-sm">
              <span className="text-xs font-medium text-muted-foreground">Email *</span>
              <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary" />
            </label>
          </div>
          <label className="block text-sm">
            <span className="text-xs font-medium text-muted-foreground">Sujet *</span>
            <input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} required className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary" />
          </label>
          <label className="block text-sm">
            <span className="text-xs font-medium text-muted-foreground">Message *</span>
            <textarea rows={6} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} required className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary" />
          </label>
          <button type="submit" disabled={sending} className="inline-flex items-center gap-2 rounded-md bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60">
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            {sending ? "Envoi..." : "Envoyer"}
          </button>
        </form>

        <div className="space-y-4">
          {[
            { i: Mail, l: "Email", v: "contact@tissage.com", c: "Réponse sous 24h" },
            { i: Phone, l: "Téléphone", v: "+261 34 12 345 67", c: "Lun-Ven 8h-18h" },
            { i: MapPin, l: "Adresse", v: "Antananarivo 101, Madagascar", c: "Siège social" },
            { i: Clock, l: "Horaires", v: "24/7", c: "Support en ligne" },
          ].map(({ i: Icon, l, v, c }) => (
            <div key={l} className="flex items-start gap-4 rounded-2xl border border-border bg-card p-5">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-or/10 text-terre"><Icon className="h-5 w-5" /></div>
              <div>
                <div className="text-sm font-semibold">{l}</div>
                <div className="text-sm text-foreground">{v}</div>
                <div className="text-xs text-muted-foreground">{c}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-16">
        <div className="rounded-2xl border border-border bg-card p-6">
          <h2 className="font-display text-xl font-bold">FAQ rapide</h2>
          <div className="mt-6 space-y-4">
            {[
              ["Comment devenir artisan sur TISSAGE ?", "Inscrivez-vous, choisissez le statut artisan, créez votre boutique en ligne et publiez vos produits. L'IA Tissage vous aide à générer fiches, traductions et SEO."],
              ["Quels sont les frais de commission ?", "Gratuit : 10%, Premium : 7%, Business : 5%. La commission est prélevée sur chaque vente après paiement."],
              ["Comment fonctionne la logistique ?", "Vous déposez vos colis au hub régional le plus proche. TISSAGE coordonne la livraison au client avec DHL, FedEx, ou notre réseau local."],
              ["Quels modes de paiement sont acceptés ?", "Visa, Mastercard, PayPal, Stripe, Apple Pay, Google Pay, MVola, Orange Money, Airtel Money, PayDunya."],
              ["Puis-je vendre à l'international ?", "Oui ! TISSAGE est conçu pour l'export. Nous gérons les documents douaniers, le groupage maritime et la traduction en 6 langues."],
            ].map(([q, r]) => (
              <details key={q} className="group rounded-lg border border-border">
                <summary className="flex cursor-pointer items-center justify-between px-4 py-3 text-sm font-medium hover:bg-muted/50">{q}<span className="text-muted-foreground transition group-open:rotate-180">▼</span></summary>
                <p className="border-t border-border px-4 py-3 text-sm text-muted-foreground">{r}</p>
              </details>
            ))}
          </div>
        </div>
      </section>
      <SiteFooter />
    </div>
  );
}
