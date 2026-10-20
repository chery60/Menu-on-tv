'use client';

import { useId, useState, type CSSProperties } from 'react';
import type { Plan } from '@/content/site-content';
import { screensCalculator } from '@/content/site-content';
import { formatRupees } from '@/features/screen/loop';
import { SCREEN_RANGE, monthlyBill, screensFrom } from '@/lib/plan-cost';

/** Pick how many screens the shop has; each plan's monthly bill adds up beside it. */
export function ScreensCalculator({ plans }: { readonly plans: readonly Plan[] }) {
  const sliderId = useId();
  const [screens, setScreens] = useState<number>(SCREEN_RANGE.min);
  const filled = ((screens - SCREEN_RANGE.min) / (SCREEN_RANGE.max - SCREEN_RANGE.min)) * 100;

  return (
    <div className="mtv-calc">
      <div className="mtv-calc-control">
        <h3 className="mtv-h3">{screensCalculator.title}</h3>
        <label htmlFor={sliderId} className="mtv-label">
          {screensCalculator.label}: <output htmlFor={sliderId}>{screens}</output>
        </label>
        <input
          id={sliderId}
          type="range"
          min={SCREEN_RANGE.min}
          max={SCREEN_RANGE.max}
          step={1}
          value={screens}
          onChange={(event) => setScreens(screensFrom(event.target.value))}
          className="mtv-range"
          style={{ '--filled': `${filled}%` } as CSSProperties}
        />
        <p className="mtv-mono">{screensCalculator.note}</p>
      </div>
      <ul className="mtv-calc-plans">
        {plans.map((plan) => {
          const bill = monthlyBill(plan, screens);
          return (
            <li key={plan.name} data-out={!bill.available}>
              <span className="mtv-calc-name">{plan.name}</span>
              {bill.available ? (
                <span className="mtv-calc-bill">
                  ₹{formatRupees(bill.total)} <span className="mtv-mono">{screensCalculator.perMonth}</span>
                </span>
              ) : (
                <span className="mtv-mono">{screensCalculator.coversOne}</span>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
