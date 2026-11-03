/**
 * useCashbackGuardSync — feeds the native Android Cashback Reminder its real,
 * user-attributed tracking URLs.
 *
 * The native detection service shows a bubble over Amazon/Flipkart/AJIO,
 * but it can't build a CashKaro click-out itself (that needs the session +
 * offers API + the logged-in user's id). So here we:
 *   1. load each partner store from the offers API (cashback_url),
 *   2. inject the user id with withTrackingUser (same as the Offers CTA),
 *   3. push { packageName, url, label } into the service via setMerchants.
 *
 * No-op off Android / when the native module isn't linked / when signed out.
 * Mount this once where it can run after login (e.g. the guard screen).
 */
import { useEffect } from 'react';
import { useOfferStore } from './useOffers';
import { useProfile } from './useProfile';
import { withTrackingUser } from '../lib/openUrl';
import * as CashbackGuard from '../../modules/cashback-guard';
import type { OfferStoreDetail } from '../api/offersMapper';

// Android package → CashKaro store slug. Slugs match the offers API
// (unique_identifier) and the website store paths. Amazon India's package is
// in.amazon.mShop.android.shopping (capital S in "mShop").
const PARTNERS = [
  { packageName: 'in.amazon.mShop.android.shopping', slug: 'amazon' },
  { packageName: 'com.flipkart.android', slug: 'flipkart' },
  { packageName: 'com.ril.ajio', slug: 'ajio' },
] as const;

/** "Upto 5.2%" / "Flat ₹500" — undefined when the store has no real rate. */
function rateLabel(store: OfferStoreDetail | null | undefined): string | undefined {
  if (!store || !store.cashbackValue || store.cashbackValue === 'Cashback') return undefined;
  return `${store.cashbackPrefix} ${store.cashbackValue}`.trim();
}

export function useCashbackGuardSync(): void {
  const { data: profile } = useProfile();

  // One query per distinct store slug. Fixed list → fixed hook order (rules of
  // hooks). Each partner package looks its store up by slug.
  const amazon = useOfferStore('amazon');
  const flipkart = useOfferStore('flipkart');
  const ajio = useOfferStore('ajio');
  const storeBySlug: Record<string, OfferStoreDetail | null | undefined> = {
    amazon: amazon.data,
    flipkart: flipkart.data,
    ajio: ajio.data,
  };

  const userId = profile?.id;

  useEffect(() => {
    if (!CashbackGuard.isSupported || userId == null) return;

    const merchants = PARTNERS.map((p) => {
      const store = storeBySlug[p.slug];
      const url = withTrackingUser(store?.cashbackUrl, userId);
      return {
        packageName: p.packageName,
        url: url || undefined,
        label: rateLabel(store),
      };
    }).filter((m) => m.url || m.label); // skip merchants with nothing resolved yet

    if (merchants.length > 0) CashbackGuard.setMerchants(merchants);
    // Re-push when the resolved URLs / user change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, amazon.data?.cashbackUrl, flipkart.data?.cashbackUrl, ajio.data?.cashbackUrl]);
}
