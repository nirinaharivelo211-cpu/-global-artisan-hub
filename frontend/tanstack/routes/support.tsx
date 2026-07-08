import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Mail, MessageCircle, BookOpen, Phone } from "lucide-react";

export const Route = createFileRoute("/support")({
  head: () => ({ meta: [{ title: "Support — TISSAGE" }] }),
  component: Support,
});

function Support() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <section className="mx-auto max-w-5xl px-6 py-16 text-center">
        <h1 className="text-4xl font-bold md:text-5xl">Nous sommes à votre <span className="text-gradient-or">écoute</span></h1>
        <p className="mt-4 text-muted-foreground">Une équipe dédiée 24/7, en plusieurs langues, pour vous accompagner.</p>
      </section>
      <section className="mx-auto max-w-6xl px-6 pb-16 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {[
          { i: MessageCircle, t: "Chat en direct", d: "Réponse immédiate de notre équipe." },
          { i: Mail, t: "Email", d: "support@tissage.world" },
          { i: Phone, t: "Téléphone", d: "+33 1 23 45 67 89" },
          { i: BookOpen, t: "Centre d'aide", d: "Guides, FAQ et tutoriels." },
        ].map(({ i: Icon, t, d }) => (
          <div key={t} className="rounded-2xl border border-border bg-card p-6 text-center shadow-card">
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-or/10 text-terre"><Icon className="h-6 w-6" /></div>
            <h3 className="mt-4 font-display font-bold">{t}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{d}</p>
          </div>
        ))}
      </section>
      <SiteFooter />
    </div>
  );
}
