'use client';

import { ArrowRight, Plus, X } from 'lucide-react';
import { useDeferredValue, useMemo, useState } from 'react';
import { PREFILL_EVENT } from '@/components/marketing/waitlist-form';
import { builder } from '@/content/site-content';
import { ScreenStage } from '@/features/screen/components/screen-stage';
import type { Diet } from '@/features/screen/types';
import { buildVisitorRestaurant, SAMPLE_DISHES, VISITOR_LIMITS } from '@/features/screen/visitor-menu';

interface DishDraft {
  readonly key: number;
  readonly name: string;
  readonly price: string;
  readonly diet: Diet;
}

const DIETS: readonly Diet[] = ['veg', 'nonveg'];

/**
 * Try it with your own menu: type a café and a few dishes, and the TV plays them through the real
 * screen player. Everything stays in this component's state; the name goes to the early-access form
 * only when the visitor heads there.
 */
export function TryIt() {
  const [cafe, setCafe] = useState('');
  const [dishes, setDishes] = useState<readonly DishDraft[]>(() =>
    SAMPLE_DISHES.map((dish, index) => ({ key: index, name: dish.name, price: String(dish.price), diet: dish.diet })),
  );
  const [nextKey, setNextKey] = useState(SAMPLE_DISHES.length);
  const restaurant = useMemo(() => buildVisitorRestaurant({ cafe, dishes }), [cafe, dishes]);
  // Typing stays instant; the TV catches up a beat later.
  const playing = useDeferredValue(restaurant);
  const cafeName = cafe.trim();

  const change = (key: number, patch: Partial<Omit<DishDraft, 'key'>>) =>
    setDishes((list) => list.map((dish) => (dish.key === key ? { ...dish, ...patch } : dish)));
  const remove = (key: number) => setDishes((list) => list.filter((dish) => dish.key !== key));
  const add = () => {
    setDishes((list) => [...list, { key: nextKey, name: '', price: '', diet: 'veg' }]);
    setNextKey((key) => key + 1);
  };
  const carryName = () => window.dispatchEvent(new CustomEvent(PREFILL_EVENT, { detail: { restaurant: cafeName } }));

  return (
    <section id="your-menu" className="mtv-try" aria-labelledby="try-title">
      <div className="mtv-sheet mtv-band mtv-try-grid">
        <div className="mtv-try-copy">
          <h2 id="try-title" className="mtv-h2">
            {builder.title}
          </h2>
          <p className="mtv-lead">{builder.lead}</p>

          <form className="mtv-try-form" onSubmit={(event) => event.preventDefault()} aria-describedby="try-privacy">
            <label className="mtv-label" htmlFor="try-cafe">
              {builder.cafeLabel}
            </label>
            <input id="try-cafe" className="mtv-field" value={cafe} maxLength={VISITOR_LIMITS.cafe} placeholder={builder.cafePlaceholder} autoComplete="organization" onChange={(event) => setCafe(event.target.value)} />

            <fieldset className="mtv-try-dishes">
              <legend className="mtv-label">Dishes</legend>
              <ul>
                {dishes.map((dish, index) => (
                  <li key={dish.key} className="mtv-try-dish">
                    <input className="mtv-field" aria-label={`${builder.dishLabel} ${index + 1}`} value={dish.name} maxLength={VISITOR_LIMITS.dish} onChange={(event) => change(dish.key, { name: event.target.value })} />
                    <span className="mtv-try-price">
                      <span aria-hidden="true">₹</span>
                      <input
                        className="mtv-field"
                        aria-label={`${builder.priceLabel}, ${builder.dishLabel.toLowerCase()} ${index + 1}`}
                        value={dish.price}
                        inputMode="numeric"
                        maxLength={4}
                        onChange={(event) => change(dish.key, { price: event.target.value.replace(/\D/g, '') })}
                      />
                    </span>
                    <span role="group" aria-label={`${builder.dishLabel} ${index + 1}: veg or non-veg`} className="mtv-try-diet">
                      {DIETS.map((diet) => (
                        <button key={diet} type="button" aria-pressed={dish.diet === diet} title={diet === 'veg' ? builder.veg : builder.nonveg} onClick={() => change(dish.key, { diet })}>
                          <span className={`mtv-diet is-${diet}`} aria-hidden="true" />
                          <span className="sr-only">{diet === 'veg' ? builder.veg : builder.nonveg}</span>
                        </button>
                      ))}
                    </span>
                    <button type="button" className="mtv-try-remove" disabled={dishes.length <= 1} onClick={() => remove(dish.key)} aria-label={`${builder.removeDish} ${dish.name || `${builder.dishLabel.toLowerCase()} ${index + 1}`}`}>
                      <X aria-hidden="true" />
                    </button>
                  </li>
                ))}
              </ul>
              <button type="button" className="mtv-btn mtv-try-add" onClick={add} disabled={dishes.length >= VISITOR_LIMITS.dishes}>
                <Plus aria-hidden="true" />
                {builder.addDish}
              </button>
            </fieldset>
            <p id="try-privacy" className="mtv-mono">
              {builder.privacy}
            </p>
          </form>

          <a href="#early-access" onClick={carryName} className="mtv-btn mtv-btn-primary">
            {cafeName ? `${builder.cta} ${cafeName}` : builder.ctaFallback}
            <ArrowRight aria-hidden="true" />
          </a>
        </div>

        <div className="mtv-try-tv">
          <div className="mtv-tv">
            <div className="mtv-tv-screen">
              <ScreenStage restaurant={playing} layout="split" theme="paper" label={`${playing.name}, on the TV`} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
