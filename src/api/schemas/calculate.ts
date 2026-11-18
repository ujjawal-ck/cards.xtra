/**
 * calculate.ts: contract for BankKaro POST /cardgenius/calculate.
 *
 * Loose on purpose (see index.ts). Only the envelope and the types the mapper
 * (`mapCalculateResponse` in src/lib/cardTools.ts) reads are checked. Field
 * facts come from the full UAT response of 2026-11-18 (219 cards): fees are
 * strings, `invite_only` is a bool or an int, `max_potential_savings` is
 * "Unlimited" or a number, and `spending_breakdown` has more keys than the
 * 21 inputs. Fixtures: src/api/__fixtures__/uat.calculate_trimmed.json and
 * uat.calculate_waiver_lounge_trimmed.json.
 */
import { z } from 'zod';

const numeric = z.union([z.number(), z.string()]).nullish();

const explanation = z
  .object({ key: z.string().nullish(), explanation: z.string().nullish() })
  .passthrough();

const breakdownLine = z
  .object({
    on: z.string().nullish(),
    spend: numeric,
    savings: numeric,
    savings_type: z.string().nullish(),
    maxCap: numeric,
    maxCapReached: z.union([z.boolean(), z.number()]).nullish(),
    explanation: z.array(explanation).nullish(),
  })
  .passthrough();

const savingsCard = z
  .object({
    seo_card_alias: z.string(),
    card_name: z.string().nullish(),
    image: z.string().nullish(),
    card_bg_image: z.string().nullish(),
    total_savings: numeric,
    total_savings_yearly: numeric,
    total_extra_benefits: numeric,
    roi: numeric,
    joining_fees: numeric,
    annual_fees: numeric,
    // Fee waiver and lounge value (D26). `annual_fee_spends` is "" when the card has no waiver.
    total_spends: numeric,
    annual_fee_spends: numeric,
    annual_fee_waiver_toggle: z.union([z.boolean(), z.number(), z.string()]).nullish(),
    travel_benefits: z.object({ total_travel_benefit_annual: numeric }).passthrough().nullish(),
    ck_rewards: numeric,
    rating: numeric,
    invite_only: z.union([z.boolean(), z.number()]).nullish(),
    max_potential_savings: numeric,
    spending_breakdown: z.record(breakdownLine.nullable()).nullish(),
  })
  .passthrough();

/** POST /cardgenius/calculate: `{ status, message, data: { success, message, savings: Card[] } }`. */
export const CalculateResponse = z
  .object({
    data: z
      .object({
        success: z.union([z.boolean(), z.number()]).nullish(),
        savings: z.array(savingsCard),
      })
      .passthrough(),
  })
  .passthrough();
