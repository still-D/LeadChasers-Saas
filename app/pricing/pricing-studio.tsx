"use client";

import { useActionState, useState } from "react";
import { Check, Minus, Plus, ReceiptText } from "lucide-react";
import type { ServiceItem } from "@/lib/pricing";
import { createQuote, type QuoteActionState } from "./actions";

const initialQuoteActionState: QuoteActionState = { status: "idle" };

type Option = { id: string; label: string };

export function PricingStudio({ items, clients, projects, canCreateQuote }: { items: ServiceItem[]; clients: Option[]; projects: Option[]; canCreateQuote: boolean }) {
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [discount, setDiscount] = useState(0);
  const [taxRate, setTaxRate] = useState(0);
  const [state, action, pending] = useActionState(createQuote, initialQuoteActionState);
  const selected = items.filter((item) => (quantities[item.id] ?? 0) > 0);
  const subtotal = selected.reduce((sum, item) => sum + Number(item.base_price) * quantities[item.id], 0);
  const afterDiscount = subtotal * (1 - discount / 100);
  const total = afterDiscount * (1 + taxRate / 100);
  const selection = JSON.stringify(selected.map((item) => ({ serviceId: item.id, quantity: quantities[item.id] })));
  const categories = [...new Set(items.map((item) => item.category))];

  function adjust(id: string, amount: number) {
    setQuantities((current) => ({ ...current, [id]: Math.max(0, Math.min(99, (current[id] ?? 0) + amount)) }));
  }

  return <div className="pricing-studio">
    <div className="rate-card-area">{categories.map((category) => <section key={category} className="rate-category"><header><span>{String(categories.indexOf(category) + 1).padStart(2, "0")}</span><h2>{category}</h2></header><div className="rate-grid">{items.filter((item) => item.category === category).map((item) => { const quantity = quantities[item.id] ?? 0; return <article className={quantity ? "selected" : ""} key={item.id}><div className="rate-check">{quantity ? <Check size={13} /> : null}</div><h3>{item.name}</h3><p>{item.description}</p><div className="rate-price"><strong>{Number(item.base_price).toLocaleString("fr-MA")}</strong><span>{item.currency} / {item.unit}</span></div><div className="quantity-control"><button type="button" onClick={() => adjust(item.id, -1)} disabled={!quantity} aria-label={`Retirer ${item.name}`}><Minus size={13} /></button><b>{quantity}</b><button type="button" onClick={() => adjust(item.id, 1)} aria-label={`Ajouter ${item.name}`}><Plus size={13} /></button></div></article>; })}</div></section>)}</div>
    <form action={action} className="quote-summary">
      <input type="hidden" name="selection" value={selection} />
      <header><span><ReceiptText size={18} /></span><div><small>ESTIMATION</small><h2>Votre devis</h2></div></header>
      <label>CLIENT<select name="clientId" defaultValue=""><option value="">À confirmer</option>{clients.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}</select></label>
      <label>PRODUCTION<select name="projectId" defaultValue=""><option value="">Non rattaché</option>{projects.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}</select></label>
      <div className="quote-lines">{selected.map((item) => <div key={item.id}><span>{item.name} <small>× {quantities[item.id]}</small></span><strong>{(Number(item.base_price) * quantities[item.id]).toLocaleString("fr-MA")} MAD</strong></div>)}{!selected.length && <p>Sélectionnez les prestations à inclure.</p>}</div>
      <div className="quote-options"><label>REMISE (%)<input name="discount" type="number" min="0" max="99" value={discount} onChange={(event) => setDiscount(Math.max(0, Number(event.target.value)))} /></label><label>TVA (%)<input name="taxRate" type="number" min="0" max="100" value={taxRate} onChange={(event) => setTaxRate(Math.max(0, Number(event.target.value)))} /></label><label>VALIDITÉ<input name="validUntil" type="date" /></label></div>
      <div className="quote-totals"><div><span>Sous-total</span><b>{subtotal.toLocaleString("fr-MA")} MAD</b></div>{discount > 0 && <div><span>Remise</span><b>− {(subtotal - afterDiscount).toLocaleString("fr-MA")} MAD</b></div>}<div className="grand-total"><span>Total estimé</span><strong>{total.toLocaleString("fr-MA", { maximumFractionDigits: 0 })} MAD</strong></div></div>
      {state.message && <p className={`form-notice ${state.status}`} role="status">{state.message}</p>}
      <button className="primary-action" type="submit" disabled={!selected.length || pending || !canCreateQuote}>{pending ? "Création…" : canCreateQuote ? "Créer le brouillon →" : "Lecture seule"}</button>
      <small className="quote-disclaimer">Prix internes indicatifs. Le calcul est revalidé côté serveur avant enregistrement.</small>
    </form>
  </div>;
}
